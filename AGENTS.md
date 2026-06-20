# AGENTS.md - StreamVid

Dokumen ini adalah instruksi utama untuk AI coding agent di project StreamVid.
Baca seluruh dokumen ini sebelum menulis, memodifikasi, atau menghapus kode apa pun.

---

## 1. Prioritas Instruksi

Urutan acuan kerja:

1. `AGENTS.md` ini
2. `ARCHITECTURE.md` untuk keputusan arsitektur, flow data, dan batas antar layer
3. `DESIGN_SYSTEM.md` untuk brand, token visual, dark mode, dan motion
4. `UI_KITS_AND_DESIGN_SYSTEM.png` untuk acuan layout, hierarchy, spacing, dan style komponen
5. `EMPTY_STATE_DESIGN.png` untuk acuan desain empty state
6. `logo.png` sebagai aset brand resmi

Jika ada konflik:
- Untuk keputusan teknis dan struktur aplikasi, ikuti `ARCHITECTURE.md`
- Untuk keputusan visual frontend, ikuti `DESIGN_SYSTEM.md` dan `UI_KITS_AND_DESIGN_SYSTEM.png`
- Untuk empty state, ikuti `EMPTY_STATE_DESIGN.png`
- Jangan membuat arah baru yang bertentangan dengan dokumen project tanpa instruksi eksplisit dari user

---

## 2. RTK - Rust Token Killer

Project ini mewajibkan penggunaan `rtk` untuk command CLI.

Aturan:
- Selalu prefix shell command dengan `rtk`
- Jika perlu menjalankan command PowerShell built-in atau command kompleks, gunakan `rtk proxy ...`

Contoh:

```bash
rtk git status
rtk npm run build
rtk cargo test
rtk pytest -q
rtk proxy powershell -NoProfile -Command "Get-Content AGENTS.md -Raw"
```

Meta command:

```bash
rtk gain
rtk gain --history
rtk proxy <cmd>
```

Verifikasi:

```bash
rtk --version
rtk gain
which rtk
```

---

## 3. Project Overview

StreamVid adalah aplikasi streaming video dengan dua role utama:

- `USER` untuk browse dan menonton video dalam pengalaman dark-first ala platform streaming modern
- `ADMIN` untuk mengelola video melalui dashboard: upload, edit, publish state, dan hapus

Video tidak di-host di server sendiri. Konten berasal dari **Doodstream**:

1. Admin paste URL Doodstream
2. Frontend memanggil backend
3. Backend fetch metadata dari Doodstream API
4. Metadata disimpan ke database
5. Frontend menggunakan `embedUrl` untuk player iframe

---

## 4. Monorepo Structure

```text
streamvid/
|-- AGENTS.md
|-- ARCHITECTURE.md
|-- DESIGN_SYSTEM.md
|-- UI_KITS_AND_DESIGN_SYSTEM.png
|-- EMPTY_STATE_DESIGN.png
|-- logo.png
|-- docker-compose.yml
|-- backend/
`-- frontend/
```

Peran folder:
- `backend/` adalah NestJS API
- `frontend/` adalah Angular SPA
- file root docs adalah source of truth untuk agent

---

## 5. Tech Stack

### Frontend

| Area | Stack |
|---|---|
| Framework | Angular 17+ |
| Pattern | Standalone components only |
| Styling | Tailwind CSS v4 |
| Local state | Angular Signals |
| Global auth state | NgRx |
| HTTP | Angular `HttpClient` + interceptors |
| Routing | Angular Router + lazy loading |
| Theme | Dark mode default, class-based |
| Player | Doodstream embed via `iframe` |
| Icons | `@lucide/angular` |

### Backend

| Area | Stack |
|---|---|
| Framework | NestJS |
| Language | TypeScript strict mode |
| ORM | Prisma |
| Auth | JWT + Passport |
| Validation | `class-validator` + `class-transformer` |
| API | REST `/api` |
| API docs | Swagger |
| Rate limit | `@nestjs/throttler` |

### Database & Infra

| Area | Stack |
|---|---|
| Database | PostgreSQL 15+ |
| Cache | Redis opsional untuk metadata Doodstream |
| Runtime | Node.js 20 LTS |
| Container | Docker + Docker Compose |

---

## 6. System Architecture

### Arsitektur Besar

StreamVid menggunakan arsitektur client-server klasik:

- `frontend` adalah Angular Single Page Application
- `backend` adalah NestJS stateless REST API
- `backend` berkomunikasi dengan PostgreSQL melalui Prisma
- `backend` juga menjadi proxy resmi untuk integrasi Doodstream

Prinsip penting:
- Frontend tidak boleh mengakses Doodstream API langsung
- Backend tidak menyimpan session server-side
- State auth diwakili access token + refresh token

### Backend Layering

Urutan layer backend:

1. Guard
2. Controller
3. Service
4. Prisma ORM
5. PostgreSQL

Aturan layer backend:
- Controller hanya menerima request, validasi DTO, lalu memanggil service
- Business logic harus ada di service
- Service tidak boleh bergantung pada `Request` atau `Response`
- Prisma query hanya boleh ada di service
- Service boleh memanggil service lain bila dibutuhkan

### Frontend Layering

Urutan layer frontend:

1. Template HTML
2. Component
3. Service
4. `HttpClient`
5. Backend API

Aturan layer frontend:
- Component tidak boleh memanggil `HttpClient` langsung
- Template tidak boleh berisi logic kompleks
- Auth service dan auth store ada di `core/auth/`
- Service fitur diletakkan dekat dengan feature-nya

### Backend Module Structure

Setiap fitur backend adalah NestJS module yang self-contained di `backend/src/modules/`.

Contoh struktur:

```text
modules/videos/
|-- videos.module.ts
|-- videos.controller.ts
|-- videos.service.ts
`-- dto/
    |-- create-video.dto.ts
    `-- update-video.dto.ts
```

Module utama yang diharapkan:
- `AuthModule`
- `UsersModule`
- `VideosModule`
- `CategoriesModule`
- `DoodstreamModule`
- `PrismaModule` sebagai global provider

### Frontend Route & Layout System

Route utama:
- `/` untuk halaman publik
- `/video/:slug`
- `/category/:slug`
- `/login`
- `/register`
- `/admin` dan turunannya untuk dashboard admin

Layout utama:
- `MainLayout` untuk user/public pages
- `AdminLayout` untuk admin pages

Aturan:
- Semua route harus lazy loaded
- Route admin harus diproteksi `authGuard` dan `roleGuard('ADMIN')`
- Gunakan `router-outlet` untuk membungkus layout shell

### State Management Decision

Gunakan pembagian state berikut:

- NgRx hanya untuk auth global:
  - `currentUser`
  - `accessToken`
  - status auth terkait
- Angular Signals untuk state UI lokal:
  - loading
  - filter
  - pagination
  - list data yang spesifik ke halaman

Aturan:
- Jangan simpan server state umum di NgRx tanpa alasan kuat
- Jangan simpan token di `localStorage` atau `sessionStorage`

---

## 7. Auth Architecture

Gunakan dual-token strategy:

| Token | Lifetime | Lokasi | Tujuan |
|---|---|---|---|
| Access Token | 15 menit | memory / NgRx | authorisasi request API |
| Refresh Token | 7 hari | `httpOnly` cookie | refresh access token |

Flow:

1. `POST /api/auth/login` mengembalikan `accessToken`
2. Browser menerima refresh token di cookie `httpOnly`
3. Request auth mengirim `Authorization: Bearer <accessToken>`
4. Jika token expired, frontend hit `POST /api/auth/refresh`
5. Jika refresh gagal, redirect ke `/login`
6. `POST /api/auth/logout` harus membersihkan cookie refresh token dan auth state frontend

JWT payload:

```ts
{
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN';
  iat: number;
  exp: number;
}
```

Aturan:
- Endpoint admin wajib memakai `JwtAuthGuard`, `RolesGuard`, dan `@Roles('ADMIN')`
- Frontend admin route wajib memakai `authGuard` dan `roleGuard('ADMIN')`

---

## 8. Doodstream Architecture

### Keputusan Inti

Backend adalah satu-satunya proxy ke Doodstream API.

Alasan:
- API key tidak boleh terekspos ke browser
- Validasi URL dilakukan di backend
- Metadata bisa di-cache di backend bila perlu
- Perubahan response dari Doodstream cukup ditangani di satu tempat

### Flow Metadata Fetch

```text
Frontend: GET /api/doodstream/info?url=<doodstream_url>
Backend:  extract file_code dari URL
          -> GET https://doodapi.com/api/file/info?key=API_KEY&file_code=<code>
          -> return metadata ter-normalisasi
Frontend: gunakan hasil untuk auto-fill form
```

Validasi URL minimal:

```ts
const match = url.match(/\/d\/([a-zA-Z0-9]+)/);
if (!match) throw new BadRequestException('Invalid Doodstream URL');
```

### Data yang Disimpan

Untuk video dari Doodstream, database sebaiknya menyimpan:
- `doodUrl`
- `doodFileId`
- `embedUrl`
- `thumbnailUrl`

Frontend player hanya membutuhkan `embedUrl` untuk render `iframe`.

---

## 9. Backend Conventions

### DTO

Aturan:
- Semua input harus divalidasi dengan `class-validator`
- DTO update harus extend `PartialType`
- Tambahkan `@ApiProperty()` untuk dokumentasi Swagger bila relevan

Contoh:

```ts
import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVideoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsUrl()
  doodUrl: string;
}
```

### Controller

Aturan:
- Tambahkan `@ApiTags()` untuk grouping Swagger
- Tambahkan `@ApiBearerAuth()` untuk endpoint auth-protected
- Prefix endpoint admin dengan `/admin/...`
- Jangan taruh business logic di controller

### Service

Aturan:
- Business logic hanya di service
- Gunakan `PrismaService` untuk akses database
- Jangan throw `Error` mentah, gunakan exception NestJS

### Error Handling

Aturan:
- Gunakan built-in exception seperti `BadRequestException`, `NotFoundException`, `UnauthorizedException`
- Jangan buat `try/catch` manual di controller jika hanya untuk rethrow
- Andalkan `HttpExceptionFilter` global untuk format error response

Response sukses dibungkus `TransformInterceptor`:

```json
{ "data": { "...": "..." }, "statusCode": 200 }
```

Format error:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["title should not be empty"],
  "timestamp": "...",
  "path": "/api/admin/videos"
}
```

### Database Decision Notes

Pedoman arsitektur data:
- Gunakan Prisma, bukan raw SQL, kecuali benar-benar diperlukan
- Jangan edit migration secara manual
- Setelah ubah schema Prisma, selalu jalankan migration dan generate client
- Model utama: `User`, `Video`, `Category`, `Tag`, `View`
- UUID lebih diprioritaskan daripada auto-increment ID untuk resource publik
- Simpan `slug` untuk URL human-readable
- `viewCount` boleh didenormalisasi di tabel `Video` demi performa
- `fileSize` besar sebaiknya memakai tipe yang aman untuk nilai besar seperti `BigInt`

---

## 10. Frontend Conventions

### Standalone Components

Project ini full standalone components.

Aturan:
- Jangan buat `NgModule` baru
- Gunakan `standalone: true`
- Import dependency langsung di component

Contoh:

```ts
@Component({
  selector: 'app-video-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './video-card.component.html',
})
export class VideoCardComponent {}
```

### Feature Folder

Setiap fitur frontend berada di `frontend/src/app/features/`.

Contoh:

```text
features/admin/video-upload/
|-- video-upload.component.ts
|-- video-upload.component.html
`-- video-upload.component.spec.ts
```

### Naming

| Item | Convention | Contoh |
|---|---|---|
| Component | PascalCase + `Component` | `VideoCardComponent` |
| Service | PascalCase + `Service` | `AuthService` |
| File | kebab-case | `video-card.component.ts` |
| Interface | PascalCase | `Video`, `IUser` |
| Signal | camelCase | `currentUser` |
| Computed | camelCase | `isLoggedIn` |

### Icons

Aturan:
- Gunakan `@lucide/angular` untuk icon SVG frontend
- Jangan tambah library icon lain tanpa alasan yang jelas
- Untuk standalone component, import `LucideAngularModule` langsung di `imports`

Contoh:

```ts
import { Component } from '@angular/core';
import { LucideAngularModule, Play } from '@lucide/angular';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [LucideAngularModule],
  template: '<lucide-icon [img]="Play" class="size-5"></lucide-icon>',
})
export class ExampleComponent {
  readonly Play = Play;
}
```

### HTTP & Services

Aturan:
- Semua HTTP call lewat service
- Prioritaskan `async` pipe di template
- Hindari `.subscribe()` di component jika tidak diperlukan
- `AuthInterceptor` harus attach bearer token
- `ErrorInterceptor` harus handle 401 dan 403 secara konsisten

### Interceptors

Perilaku yang diharapkan:
- `AuthInterceptor` menambahkan header `Authorization`
- `ErrorInterceptor`:
  - 401 -> coba refresh token -> bila gagal redirect login
  - 403 -> redirect forbidden
  - 500 -> tampilkan feedback error global bila ada mekanismenya

---

## 11. Design System Rules

Untuk semua pekerjaan UI frontend, agent wajib membaca dan mengikuti `DESIGN_SYSTEM.md`.

### Theme Direction

Dark mode adalah default render, bukan mode tambahan.

Aturan wajib:
- Pasang `class="dark"` pada root document
- Background shell aplikasi harus dark sejak first paint
- Surface utama, navbar, modal, card, input, dan dropdown harus didesain dark-first
- Light fallback boleh ada, tetapi output default harus tetap dark

### Brand DNA

Nuansa visual StreamVid:
- Fast
- Premium
- Immersive
- Neon Tech
- Dark-first

Gunakan karakter visual yang modern dan tajam, bukan UI generik yang datar.

### Color Tokens

Gunakan token dari design system sebagai acuan utama:

- Primary: skala ungu berbasis `#7C3AED`
- Secondary: biru `#2563EB`
- Accent: cyan `#06B6D4`
- Background: `#030712`
- Surface: `#18181B`
- Surface elevated: `#27272A`
- Text primary: `#F9FAFB`
- Text secondary: `#9CA3AF`
- Danger: `#EF4444`
- Success: `#22C55E`
- Warning: `#F59E0B`

### Gradients

Gunakan gradient brand jika butuh aksen visual:

- `brand-gradient`: ungu -> biru -> cyan
- `hero-gradient`: dark gradient untuk hero/background besar

### Typography

Aturan default:
- Font family utama: `Inter`
- Gunakan hierarchy yang jelas untuk display, heading, body, dan small text

### Radius, Shadow, Motion

Gunakan nilai yang kompatibel dengan design system:
- Radius: `8 / 12 / 16 / 24 / 32`
- Shadow card: `0 8px 24px rgba(0,0,0,.35)`
- Glow primary dan accent boleh dipakai sebagai aksen
- Motion duration: `150ms / 250ms / 400ms`
- Easing utama: `cubic-bezier(0.4,0,0.2,1)`

### Tailwind / CSS Variables

Jika menambah token, selaraskan dengan skala ini:

```css
:root {
  --sv-primary: #7C3AED;
  --sv-secondary: #2563EB;
  --sv-accent: #06B6D4;
  --sv-bg: #030712;
  --sv-surface: #18181B;
  --sv-text-primary: #F9FAFB;
  --sv-text-secondary: #9CA3AF;
}
```

### Visual Guardrails

Aturan:
- Jangan mengganti, mendistorsi, atau mewarnai ulang `logo.png` tanpa instruksi user
- Jangan membuat palette acak yang keluar dari brand system
- Untuk halaman atau komponen baru, prioritaskan reuse pola visual yang sudah ada
- Untuk layout public/user, prioritaskan gutter horizontal yang kecil dan feel yang luas; hindari container sempit atau margin kiri-kanan besar kecuali memang dibutuhkan oleh konteks khusus
- Jika memakai container `max-width`, pilih nilai yang longgar dan padding horizontal yang tipis agar konten terasa dekat ke full-width, terutama di desktop
- Untuk navigasi public/user bergaya sidebar atau offcanvas, hindari header atau section penjelas yang redundan seperti blok `Navigation` jika item menu sudah cukup jelas dengan sendirinya
- Pada halaman detail video, prioritaskan proporsi yang mirip platform video modern: player besar, kolom video terkait padat, thumbnail terkait besar, dan teks pendukung lebih ringkas
- Cocokkan hierarchy dan spacing dengan `UI_KITS_AND_DESIGN_SYSTEM.png`
- Untuk state kosong, cocokkan struktur card, proporsi ilustrasi, alignment teks, dan pola CTA dengan `EMPTY_STATE_DESIGN.png`
- Empty state sebaiknya memiliki ilustrasi yang relevan, judul singkat, deskripsi ringkas, dan 1-2 CTA yang jelas
- Semua content atau komponen yang bisa diklik harus menampilkan `cursor: pointer`
- Jangan biarkan card, menu item, avatar trigger, CTA, atau wrapper interaktif tetap memakai cursor default

### Tailwind Dark Mode Pattern

Selalu sediakan fallback light dan dark class, tetapi tetap jaga default render dark.

Contoh benar:

```html
<div class="bg-white text-gray-900 dark:bg-zinc-900 dark:text-white"></div>
```

Contoh salah:

```html
<div class="bg-zinc-900 text-white"></div>
```

---

## 12. Security Rules

Aturan ini wajib diikuti:

1. Jangan simpan JWT atau token apa pun di `localStorage` atau `sessionStorage`
2. Jangan expose `DOODSTREAM_API_KEY` ke frontend atau response API
3. Jangan skip validasi DTO
4. Selalu hash password dengan bcrypt, minimal cost factor 12
5. Selalu gunakan Prisma query, bukan raw SQL, kecuali sangat diperlukan
6. Selalu protect endpoint admin dengan `JwtAuthGuard`, `RolesGuard`, dan `@Roles('ADMIN')`
7. Jangan pernah return `passwordHash` di response
8. Jangan hardcode URL, port, credentials, atau secrets

---

## 13. Commands

### Docker

```bash
rtk proxy powershell -NoProfile -Command "docker compose up --build"
rtk proxy powershell -NoProfile -Command "docker compose up -d"
rtk proxy powershell -NoProfile -Command "docker compose down"
rtk proxy powershell -NoProfile -Command "docker compose logs -f backend frontend postgres"
```

Aturan Docker:
- Frontend production berjalan di Nginx dan harus mengakses API lewat path relatif `/api`, bukan hardcoded `http://localhost:3000/api`
- Nginx frontend bertugas me-proxy `/api` ke service `backend` di network Docker
- Jangan ubah konfigurasi build production Angular sehingga `environment.prod.ts` tidak terpakai
- Jika ada perubahan pada URL API frontend production, verifikasi `frontend/angular.json` masih memiliki `fileReplacements` untuk mode production
- Jika ada perubahan Docker backend, verifikasi entrypoint cocok dengan output build NestJS yang aktual

### Backend

```bash
rtk npm run start:dev --prefix backend
rtk npm run build --prefix backend
rtk npm run test --prefix backend
rtk proxy powershell -NoProfile -Command "cd backend; npm run test:e2e"
rtk proxy powershell -NoProfile -Command "cd backend; npx prisma migrate dev"
rtk proxy powershell -NoProfile -Command "cd backend; npx prisma generate"
rtk proxy powershell -NoProfile -Command "cd backend; npx prisma db seed"
rtk proxy powershell -NoProfile -Command "cd backend; npx prisma studio"
```

### Frontend

```bash
rtk proxy powershell -NoProfile -Command "cd frontend; ng serve"
rtk npm run build --prefix frontend
rtk npm run test --prefix frontend
rtk proxy powershell -NoProfile -Command "cd frontend; ng generate component path/to/component --standalone"
rtk proxy powershell -NoProfile -Command "cd frontend; ng generate service path/to/service"
rtk proxy powershell -NoProfile -Command "cd frontend; npm install"
```

Jika menjalankan dari agent CLI, tetap gunakan prefix `rtk`.

---

## 14. Yang Tidak Boleh Dilakukan Agent

- Jangan install package baru tanpa alasan jelas
- Jangan ubah `backend/prisma/schema.prisma` tanpa membuat migration baru
- Jangan gunakan `any` jika masih ada tipe yang lebih tepat
- Jangan buat `NgModule` baru
- Jangan gunakan `var`
- Jangan gunakan `console.log` di production code
- Jangan bypass service layer
- Jangan panggil Doodstream langsung dari frontend
- Jangan edit manual file migration Prisma
- Jangan menciptakan arah visual baru yang bertentangan dengan design system

---

## 15. Checklist Sebelum Menyelesaikan Task

Sebelum selesai, agent harus memastikan:

1. Perubahan mengikuti arsitektur layer dan module boundary
2. UI mengikuti `DESIGN_SYSTEM.md` dan `UI_KITS_AND_DESIGN_SYSTEM.png`
3. Empty state mengikuti `EMPTY_STATE_DESIGN.png` bila ada state kosong
4. Dark mode tetap menjadi default render
5. Tidak ada token, secret, atau API key yang bocor ke frontend
6. Tidak ada business logic berat di controller atau template
7. Endpoint admin tetap aman dengan guard dan role check
8. Jika Prisma schema berubah, migration dan generate sudah dipikirkan
9. Tidak ada pelanggaran terhadap larangan di dokumen ini
10. Jika menyentuh Docker atau build frontend production, verifikasi flow `/api` di container masih bekerja

---

Referensi tambahan:
- `ARCHITECTURE.md`
- `DESIGN_SYSTEM.md`
- `@RTK.md`
