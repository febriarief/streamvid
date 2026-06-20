# StreamVid Design System v1

## Theme Direction

Implementasi frontend StreamVid harus menganggap dark mode sebagai default, bukan mode opsional.

Aturan dasar:
- Pasang class `dark` di root document (`<html>`) secara default
- Background shell aplikasi wajib memakai base gelap (`#030712` atau gradient turunannya), bukan putih
- Surface utama, navbar, modal, card, input, dan dropdown harus muncul dalam varian dark lebih dulu
- Fallback light boleh tetap ada pada utility class, tetapi hasil render default harus tetap dark-first
- Jika ada halaman baru, hindari base class seperti `bg-white` atau `text-gray-900` tanpa pasangan dark yang benar-benar menjadi default render

## Brand DNA

StreamVid adalah platform streaming video modern dengan nuansa:
- Fast
- Premium
- Immersive
- Neon Tech
- Dark-first

Inspirasi visual:
- Streaming platform modern
- Cyber neon
- Motion & speed
- Play button sebagai identitas utama

---

# Core Brand Colors

## Primary Scale (Purple)

| Token | Value |
|---------|---------|
| primary-50 | #F5F3FF |
| primary-100 | #EDE9FE |
| primary-200 | #DDD6FE |
| primary-300 | #C4B5FD |
| primary-400 | #A78BFA |
| primary-500 | #8B5CF6 |
| primary-600 | #7C3AED |
| primary-700 | #6D28D9 |
| primary-800 | #5B21B6 |
| primary-900 | #4C1D95 |

## Secondary Scale (Blue)

Base: #2563EB

## Accent Scale (Cyan)

Base: #06B6D4

---

# Semantic Colors

success = #22C55E
warning = #F59E0B
danger = #EF4444
info = #3B82F6

---

# Dark Theme

background = #030712
surface = #18181B
surface-elevated = #27272A
surface-modal = #3F3F46

text-primary = #F9FAFB
text-secondary = #9CA3AF
text-muted = #71717A

---

# Gradients

brand-gradient:
linear-gradient(
90deg,
#7C3AED 0%,
#2563EB 50%,
#06B6D4 100%
)

hero-gradient:
linear-gradient(
135deg,
#030712,
#111827
)

---

# Typography

Font Family:
Inter

Display:
64 / 72 / 700

H1:
48 / 56 / 700

H2:
36 / 44 / 700

H3:
30 / 38 / 600

Body:
16 / 24 / 400

Small:
14 / 20 / 400

---

# Radius

sm = 8
md = 12
lg = 16
xl = 24
2xl = 32

---

# Shadows

card:
0 8px 24px rgba(0,0,0,.35)

glow-primary:
0 0 40px rgba(124,58,237,.45)

glow-accent:
0 0 40px rgba(6,182,212,.45)

---

# Motion

fast = 150ms
normal = 250ms
slow = 400ms

ease-standard:
cubic-bezier(0.4,0,0.2,1)

---

# Tailwind Theme

```js
colors: {
  primary: '#7C3AED',
  secondary: '#2563EB',
  accent: '#06B6D4',
  background: '#030712',
  surface: '#18181B'
}
```

# CSS Variables

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
