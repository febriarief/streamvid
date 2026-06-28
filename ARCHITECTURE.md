# ARCHITECTURE.md — StreamVid

Dokumen ini menjelaskan keputusan arsitektur, flow data, dan pattern yang digunakan di project StreamVid.
Baca ini sebelum membuat fitur baru atau mengubah struktur yang sudah ada.

---

## 1. Gambaran Besar

StreamVid menggunakan arsitektur **client-server klasik** dengan pemisahan yang jelas:

```
┌─────────────────┐         ┌─────────────────┐         ┌──────────────┐
│   Angular SPA   │──REST──▶│   NestJS API    │──────── ▶│  PostgreSQL  │
│   (port 4200)   │◀────────│   (port 3000)   │         └──────────────┘
└─────────────────┘         │                 │
                            │                 │──────── ▶│  Doodstream  │
                            └─────────────────┘         │  API (ext.)  │
                                                        └──────────────┘
```

Frontend adalah **Single Page Application** — hanya satu `index.html`, routing dihandle Angular di browser. Backend adalah **stateless REST API** — tidak menyimpan session, semua state auth ada di JWT.

---

## 2. Layer Architecture

### Backend Layers

```
HTTP Request
     │
     ▼
[ Guard ]          → cek JWT valid, cek role
     │
     ▼
[ Controller ]     → terima request, validasi DTO, panggil service
     │
     ▼
[ Service ]        → logic bisnis, koordinasi antar resource
     │
     ▼
[ Prisma ORM ]     → query ke database
     │
     ▼
[ PostgreSQL ]
```

**Aturan antar layer:**
- Controller **tidak boleh** berisi logic bisnis — hanya parsing request dan memanggil service
- Service **tidak boleh** tahu soal HTTP (tidak ada `Request`, `Response` object di service)
- Service boleh memanggil service lain (misal `VideosService` memanggil `DoodstreamService`)
- Prisma query **hanya** ada di service, tidak di controller

### Frontend Layers

```
[ Template (HTML) ]    → tampilan, binding ke signals/observables
       │
       ▼
[ Component ]          → logic presentasi, memanggil service
       │
       ▼
[ Service ]            → HTTP call, transformasi data, business logic ringan
       │
       ▼
[ HttpClient ]         → dengan interceptors (auth, error)
       │
       ▼
[ Backend API ]
```

**Aturan antar layer:**
- Component **tidak boleh** memanggil `HttpClient` langsung — selalu lewat service
- Template **tidak boleh** berisi logic kompleks — pindahkan ke component atau service
- Service yang berhubungan dengan auth ada di `core/auth/`
- Service yang berhubungan dengan fitur ada di folder fiturnya masing-masing
- Komponen UI yang dipakai lebih dari satu halaman harus dipusatkan di `frontend/src/app/shared/components/`
- Pagination adalah shared UI; semua halaman berpaginasi wajib memakai shared component yang sama

---

## 3. Module Structure (Backend)

Setiap fitur adalah satu NestJS module yang self-contained:

```
AppModule
├── PrismaModule        (global — dipakai semua module)
├── AuthModule          (login, register, JWT strategy)
├── UsersModule         (CRUD user, role management)
├── VideosModule        (CRUD video, public & admin)
├── CategoriesModule    (CRUD kategori)
└── DoodstreamModule    (wrapper API Doodstream)
```

**`PrismaModule`** di-set sebagai `@Global()` supaya `PrismaService` bisa diinjeksi di semua module tanpa perlu import berulang.

**`DoodstreamModule`** hanya dipanggil dari `VideosModule` dan controller-nya sendiri (`/api/doodstream/info`). Tidak ada module lain yang perlu tahu soal Doodstream.

---

## 4. Auth Architecture

### Keputusan: Dual Token (Access + Refresh)

Menggunakan dua token dengan lifetime berbeda:

| Token | Lifetime | Penyimpanan | Tujuan |
|-------|----------|-------------|--------|
| Access Token | 15 menit | Memory (NgRx state) | Authorize setiap API request |
| Refresh Token | 7 hari | `httpOnly` cookie | Dapatkan access token baru |

**Kenapa bukan satu token saja?**
Token dengan lifetime panjang berisiko — kalau dicuri, attacker punya akses lama. Token pendek aman tapi user harus login ulang tiap 15 menit. Dual token solusi tengahnya.

**Kenapa refresh token di `httpOnly` cookie?**
Cookie `httpOnly` tidak bisa diakses JavaScript — aman dari XSS attack. Browser otomatis kirim cookie di setiap request ke domain yang sama, jadi tidak perlu logika tambahan di frontend.

**Kenapa access token di memory (bukan localStorage)?**
`localStorage` rentan XSS. Memory (NgRx state) hilang saat tab ditutup, tapi itu justru perilaku yang diinginkan — user harus login ulang kalau buka tab baru (refresh token akan handle ini secara otomatis via `/api/auth/refresh`).

### Flow Auth Lengkap

```
1. LOGIN
   POST /api/auth/login { email, password }
   ← 200 { accessToken }
   ← Set-Cookie: refreshToken=xxx; HttpOnly; Secure; SameSite=Strict

2. REQUEST DENGAN AUTH
   GET /api/admin/videos
   → Authorization: Bearer <accessToken>
   ← 200 { data: [...] }

3. ACCESS TOKEN EXPIRED (401)
   Frontend interceptor tangkap 401
   → POST /api/auth/refresh  (cookie refreshToken otomatis terkirim)
   ← 200 { accessToken: "baru" }
   → Ulangi request original dengan token baru

4. REFRESH TOKEN EXPIRED
   ← 401 dari /api/auth/refresh
   → Redirect ke /login

5. LOGOUT
   POST /api/auth/logout
   ← 200 + Clear-Cookie (hapus refreshToken)
   → Hapus accessToken dari NgRx state
   → Redirect ke /login
```

### Role Guard

Role disimpan di JWT payload (`role: 'USER' | 'ADMIN'`). Setiap request ke endpoint admin:

```
Request masuk
     │
     ▼
JwtAuthGuard        → verifikasi token valid, decode payload
     │
     ▼
RolesGuard          → cek payload.role === required role
     │
     ▼
Controller method
```

Di frontend, `roleGuard` di router cek role dari NgRx state sebelum render halaman admin.

---

## 5. Video & Doodstream Architecture

### Keputusan: Backend sebagai Proxy Doodstream

Frontend **tidak boleh** memanggil Doodstream API langsung. Semua call lewat backend.

**Alasan:**
- API key Doodstream tidak boleh ada di browser (bisa dilihat di DevTools)
- Backend bisa validasi URL sebelum hit API eksternal
- Backend bisa cache response (Redis) untuk kurangi API call ke Doodstream
- Kalau Doodstream ganti format response, cukup update di satu tempat (backend)

### Flow Upload Video

```
Admin                Frontend              Backend           Doodstream API
  │                     │                     │                    │
  │──paste URL─────────▶│                     │                    │
  │                     │──GET /doodstream────▶│                    │
  │                     │    /info?url=...     │──GET file/info────▶│
  │                     │                     │◀──{ title, img... }─│
  │                     │◀──{ metadata }───────│                    │
  │◀──form auto-filled──│                     │                    │
  │                     │                     │                    │
  │──edit & submit──────▶│                     │                    │
  │                     │──POST /admin/videos─▶│                    │
  │                     │                     │──INSERT ke DB       │
  │                     │◀──{ video created }──│                    │
```

### Struktur Data Video

Video di database menyimpan:
- `doodUrl` — URL original yang di-paste admin (untuk referensi)
- `doodFileId` — file code unik dari Doodstream (untuk re-fetch metadata kalau perlu)
- `embedUrl` — URL embed iframe yang langsung dipakai di player
- `thumbnailUrl` — disimpan di DB supaya tidak perlu hit Doodstream setiap load halaman

Player di frontend hanya butuh `embedUrl` untuk render `<iframe>`.

---

## 6. Frontend Architecture

### Routing Structure

```
/                          → MainLayout
  /                        → HomeComponent (video grid)
  /video/:slug             → VideoDetailComponent
  /category/:slug          → CategoryComponent
  /login                   → LoginComponent
  /register                → RegisterComponent

/admin                     → AdminLayout (guard: ADMIN only)
  /admin                   → DashboardComponent
  /admin/videos            → VideoListComponent
  /admin/videos/upload     → VideoUploadComponent
  /admin/videos/:id/edit   → VideoEditComponent
  /admin/users             → UserManagementComponent
```

Semua route menggunakan **lazy loading** — chunk JS hanya di-download saat route diakses. Ini penting untuk performa initial load.

### Layout System

Ada dua layout berbeda yang di-wrap dengan `<router-outlet>`:

**MainLayout** (untuk user):
```
┌──────────────────────────────────────┐
│  Navbar (sticky top)                 │
├──────────────────────────────────────┤
│  Category filter bar                 │
├──────────────────────────────────────┤
│  <router-outlet>                     │
│  (HomeComponent / VideoDetail / dll) │
└──────────────────────────────────────┘
```

**AdminLayout** (untuk admin):
```
┌─────────┬────────────────────────────┐
│         │  Topbar                    │
│ Sidebar ├────────────────────────────┤
│         │  <router-outlet>           │
│ (fixed) │  (Dashboard / Upload / dll)│
└─────────┴────────────────────────────┘
```

### State Management

```
NgRx Store (global)
└── auth/
    ├── currentUser: User | null
    ├── accessToken: string | null
    └── isLoading: boolean

Angular Signals (per-component)
├── videos: Signal<Video[]>
├── selectedCategory: Signal<string>
├── searchQuery: Signal<string>
└── isLoading: Signal<boolean>
```

**Aturan:**
- Auth state di NgRx karena dibutuhkan di banyak tempat (navbar, guards, interceptors)
- State UI lokal (loading, filter, pagination) pakai Signals di component
- Jangan taruh state server (data dari API) di NgRx — gunakan Angular Signals + service

### HTTP Interceptors

Dua interceptor yang aktif untuk semua request:

**`AuthInterceptor`** — attach token:
```
Request keluar → tambahkan header Authorization: Bearer <token>
```

**`ErrorInterceptor`** — handle error global:
```
Response 401 → coba refresh token → kalau gagal, redirect /login
Response 403 → redirect /forbidden
Response 500 → tampilkan toast error
```

---

## 7. Database Design Decisions

### Kenapa UUID bukan auto-increment ID?

UUID (`@default(uuid())`) dipakai sebagai primary key karena:
- Tidak expose jumlah data ke user (dari URL `/video/1`, `/video/2`, dll user bisa tahu ada berapa video)
- Lebih aman untuk API publik
- Tidak ada dependency ke sequence database kalau nanti perlu split database

### Kenapa ada field `slug` di Video?

URL yang SEO-friendly: `/video/cara-belajar-nextjs` lebih baik dari `/video/550e8400-e29b-41d4...`

Slug di-generate otomatis dari title saat video dibuat, dengan suffix random pendek untuk hindari duplikat:
```
title: "Cara Belajar Next.js dari Nol"
slug:  "cara-belajar-nextjs-dari-nol-x7k2"
```

### Kenapa `viewCount` disimpan di tabel Video (denormalized)?

View individual disimpan di tabel `View` untuk analytics detail. Tapi menghitung `COUNT(*)` dari tabel `View` untuk setiap video di halaman home sangat lambat.

Solusi: `viewCount` di tabel `Video` di-increment setiap ada view baru. Trade-off: data sedikit redundan tapi query home page jauh lebih cepat.

### Kenapa `fileSize` tipe `BigInt`?

File video bisa sangat besar (>2GB). JavaScript `number` hanya akurat sampai 2^53, sedangkan `BigInt` PostgreSQL bisa sampai 9.2 exabyte. Prisma map `BigInt` ke JavaScript `BigInt` type.

---

## 8. Error Handling Strategy

### Backend

Semua error di-handle di dua tempat:

1. **`HttpExceptionFilter`** (global) — menangkap semua exception dan format ke response standar
2. **`class-validator`** — validasi DTO, error otomatis dilempar sebelum masuk controller

Tidak ada `try-catch` manual di controller. Service boleh lempar exception, filter yang tangkap.

Format error konsisten:
```json
{
  "statusCode": 404,
  "message": "Video not found",
  "errors": [],
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/videos/slug-yang-tidak-ada"
}
```

### Frontend

Error di-handle di dua tempat:

1. **`ErrorInterceptor`** — handle error HTTP global (401, 403, 500)
2. **Component level** — handle error spesifik yang perlu feedback ke user (misal form validation error dari API)

Toast notification untuk error yang perlu diketahui user. Console error untuk debugging tapi tidak ditampilkan ke user.

---

## 9. Keputusan yang Sengaja Tidak Dilakukan

Ini hal-hal yang mungkin terlihat "kurang" tapi sengaja tidak diimplementasi di versi awal:

| Hal | Alasan tidak dilakukan |
|-----|----------------------|
| Upload video langsung ke server | Video di-host Doodstream, server tidak perlu storage besar |
| Server-side rendering (SSR) | Konten tidak perlu SEO publik, SPA sudah cukup |
| WebSocket / real-time | Tidak ada fitur yang butuh real-time di v1 |
| Search engine (Elasticsearch) | PostgreSQL full-text search cukup untuk skala awal |
| Microservices | Monolith lebih mudah di-maintain untuk tim kecil |
| Email verification | Bisa ditambah di v2 |
| Social login (Google, dll) | Bisa ditambah di v2 |
