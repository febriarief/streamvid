# StreamVid

StreamVid adalah aplikasi streaming video monorepo dengan frontend Angular dan backend NestJS. Platform ini punya dua role utama:

- `USER` untuk browsing dan menonton video dengan pengalaman dark-first
- `ADMIN` untuk mengelola katalog video, kategori, metadata konten, dan overview dashboard

Konten video tidak di-host langsung oleh aplikasi. Admin menambahkan video dari Doodstream, lalu backend mengambil metadata dan frontend memutar video lewat `embedUrl`.

## Highlights

- Monorepo `frontend` + `backend`
- Angular SPA dengan standalone components, Signals, NgRx untuk auth, dan Tailwind CSS v4
- NestJS REST API dengan Prisma dan PostgreSQL
- Integrasi Doodstream hanya lewat backend agar API key tetap aman
- Dual-token auth: access token di memory, refresh token di `httpOnly` cookie
- Dashboard admin untuk video, kategori, profil, dan overview data
- Halaman publik tambahan untuk `explore`, `trending`, dan `library`

## Arsitektur Singkat

```text
Angular SPA (localhost:4200 / localhost via Docker)
        |
        v
NestJS API (/api, localhost:3000 di dev, internal container di Docker)
        |
        +--> PostgreSQL
        |
        +--> Doodstream API
```

Prinsip penting:

- Frontend tidak boleh mengakses Doodstream API secara langsung
- Business logic backend berada di service, bukan controller
- Komponen frontend mengakses data lewat service, bukan `HttpClient` langsung
- Dark mode adalah default render untuk seluruh pengalaman pengguna

## Tech Stack

### Frontend

- Angular 21
- Standalone Components
- Tailwind CSS v4
- Angular Signals
- NgRx Store + Effects untuk auth global
- Angular Router lazy loading
- `@lucide/angular`

### Backend

- NestJS 11
- TypeScript strict mode
- Prisma 7
- PostgreSQL 15
- JWT + Passport
- `class-validator` + `class-transformer`
- `bcrypt`

## Struktur Repo

```text
streamvid/
|-- AGENTS.md
|-- ARCHITECTURE.md
|-- DESIGN_SYSTEM.md
|-- docker-compose.yml
|-- backend/
`-- frontend/
```

Folder utama:

- `frontend/` berisi Angular SPA untuk public pages dan admin dashboard
- `backend/` berisi NestJS API, Prisma schema, migration, dan seed
- file root seperti `ARCHITECTURE.md` dan `DESIGN_SYSTEM.md` menjadi acuan struktur dan visual project

## Fitur Utama

### Public

- Home page dengan daftar video
- Explore page untuk browsing konten
- Trending page
- Detail video berdasarkan `slug`
- Profil user setelah login
- Library user setelah login
- Layout dark-first dengan visual premium neon-tech

### Admin

- Login user dan admin
- Dashboard ringkasan data
- Manajemen video
- Manajemen kategori
- Profil admin

## Auth Flow

StreamVid memakai strategi dual token:

- `accessToken` berlaku 15 menit dan disimpan di memory frontend
- `refreshToken` berlaku 7 hari dan disimpan di cookie `httpOnly`

Flow singkat:

1. `POST /api/auth/login` mengembalikan `accessToken`
2. Backend menyetel cookie `refreshToken`
3. Request berikutnya mengirim `Authorization: Bearer <accessToken>`
4. Saat token kedaluwarsa, frontend memanggil `POST /api/auth/refresh`
5. Jika refresh gagal, user diarahkan kembali ke `/login`

## Doodstream Flow

Semua integrasi Doodstream harus lewat backend.

1. Admin memasukkan URL Doodstream
2. Frontend memanggil backend
3. Backend mengekstrak `file_code` dari URL
4. Backend memanggil Doodstream API
5. Metadata dinormalisasi lalu disimpan ke database
6. Frontend memakai `embedUrl` untuk player iframe

Data video yang relevan disimpan di database:

- `doodUrl`
- `doodFileId`
- `embedUrl`
- `thumbnailUrl`
- `duration`
- `fileSize`
- `status`

## Prasyarat

- Node.js 20 LTS atau lebih baru
- npm
- Docker Desktop atau Docker Engine
- `rtk` untuk menjalankan command project

Verifikasi `rtk`:

```bash
rtk --version
rtk gain
```

## Setup Lokal

### 1. Install dependencies

```bash
rtk proxy powershell -NoProfile -Command "cd frontend; npm install"
rtk proxy powershell -NoProfile -Command "cd backend; npm install"
```

### 2. Jalankan PostgreSQL

```bash
rtk proxy powershell -NoProfile -Command "docker compose up -d postgres"
```

Jika ingin menjalankan seluruh stack Docker sekaligus:

```bash
rtk proxy powershell -NoProfile -Command "docker compose up --build"
```

Catatan Docker:

- Frontend container dipublish ke `http://localhost`
- Frontend production memanggil API lewat path relatif `/api`
- Nginx di frontend me-proxy `/api` ke service `backend` di network Docker
- Service `backend` dan `postgres` tidak dipublish ke host secara default

Service PostgreSQL di `docker-compose.yml` memakai konfigurasi default:

- database: `streamvid`
- user: `streamvid_user`
- password: `streamvid_pass`
- host internal Docker: `postgres:5432`

### 3. Siapkan environment backend

Buat file `backend/.env`:

```env
DATABASE_URL="postgresql://streamvid_user:streamvid_pass@localhost:5433/streamvid"
JWT_SECRET="replace-with-a-strong-secret"
DOODSTREAM_API_KEY="replace-with-your-doodstream-key"
PORT=3000
NODE_ENV=development
```

Catatan:

- Untuk development lokal di luar Docker, sesuaikan host database Anda sendiri
- Untuk runtime Docker Compose, `DATABASE_URL` dioverride menjadi `postgresql://streamvid_user:streamvid_pass@postgres:5432/streamvid`
- `DATABASE_URL` wajib ada untuk Prisma dan seed
- `JWT_SECRET` dipakai untuk access token dan refresh token
- `DOODSTREAM_API_KEY` hanya boleh dipakai di backend

### 4. Jalankan migration dan generate Prisma client

```bash
rtk proxy powershell -NoProfile -Command "cd backend; npx prisma migrate dev"
rtk proxy powershell -NoProfile -Command "cd backend; npx prisma generate"
```

### 5. Seed data awal

```bash
rtk proxy powershell -NoProfile -Command "cd backend; npx prisma db seed"
```

Akun demo dari seed:

- Admin: `admin@streamvid.local` / `Admin123!`
- User: `user@streamvid.local` / `User123!`

### 6. Jalankan backend dan frontend

Backend:

```bash
rtk npm run start:dev --prefix backend
```

Frontend:

```bash
rtk proxy powershell -NoProfile -Command "cd frontend; ng serve"
```

URL default:

- Frontend: `http://localhost:4200`
- Backend API: `http://localhost:3000/api`
- Docker app: `http://localhost`

## Catatan Environment Frontend

- `frontend/src/environments/environment.ts` dipakai untuk development lokal dan menunjuk ke `http://localhost:3000/api`
- `frontend/src/environments/environment.prod.ts` dipakai untuk build production dan Docker, dengan `apiUrl: '/api'`
- Build production Angular harus memakai file replacement environment production

## Scripts Harian

### Frontend

```bash
rtk npm run build --prefix frontend
rtk npm run test --prefix frontend
rtk proxy powershell -NoProfile -Command "cd frontend; ng serve"
```

### Backend

```bash
rtk npm run build --prefix backend
rtk npm run test --prefix backend
rtk proxy powershell -NoProfile -Command "cd backend; npm run test:e2e"
rtk proxy powershell -NoProfile -Command "cd backend; npm run start:dev"
```

### Prisma

```bash
rtk proxy powershell -NoProfile -Command "cd backend; npx prisma migrate dev"
rtk proxy powershell -NoProfile -Command "cd backend; npx prisma generate"
rtk proxy powershell -NoProfile -Command "cd backend; npx prisma studio"
```

## Struktur Aplikasi Saat Ini

### Frontend routes

- `/` home video list
- `/explore` browse katalog video
- `/trending` daftar video trending
- `/video/:slug` detail video
- `/profile` profil user
- `/library` library user
- `/login` login
- `/admin/dashboard` dashboard admin
- `/admin/videos` manajemen video
- `/admin/categories` manajemen kategori
- `/admin/profile` profil admin

### Backend modules

- `AuthModule`
- `UsersModule`
- `VideosModule`
- `CategoriesModule`
- `DoodstreamModule`
- `PrismaModule`

### Backend endpoints utama

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/videos`
- `GET /api/videos/trending`
- `GET /api/videos/:slug`
- `GET /api/categories`
- `GET /api/admin/stats`
- `GET /api/admin/videos`
- `POST /api/admin/videos`
- `PUT /api/admin/videos/:id`
- `PATCH /api/admin/videos/:id/status`
- `DELETE /api/admin/videos/:id`
- `GET /api/admin/categories`
- `POST /api/admin/categories`
- `PATCH /api/admin/categories/:id`
- `DELETE /api/admin/categories/:id`

## Skema Data Inti

Model utama di Prisma:

- `User`
- `Video`
- `Category`
- `Tag`
- `View`

Keputusan data penting:

- Primary key memakai UUID
- Video memakai `slug` untuk URL yang lebih ramah
- `viewCount` disimpan di tabel `Video` untuk performa
- `fileSize` memakai `BigInt`

## Konvensi Penting

- Gunakan `rtk` untuk semua command CLI project
- Jangan simpan token di `localStorage` atau `sessionStorage`
- Jangan expose `DOODSTREAM_API_KEY` ke frontend
- Jangan tambahkan business logic berat di controller backend
- Jangan buat `NgModule` baru di frontend
- Gunakan standalone components untuk semua komponen Angular
- Jaga dark mode sebagai default render

## Referensi Project

- [AGENTS.md](AGENTS.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)

Dokumen-dokumen tersebut adalah source of truth untuk keputusan arsitektur, aturan frontend, dan visual system StreamVid.
