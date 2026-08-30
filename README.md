# Website Lengkap (CMS, Toko-Online)

A modern, high-performance multi-tenant CMS built with Next.js, Prisma, and PostgreSQL. Designed for speed, flexibility, and a premium editorial experience.

---

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Setup environment
cp .env.example .env

# Generate Prisma client & sync DB
bun run prisma:generate
bun run prisma:db-push

# Run development with Turbopack
bun dev
```

---

## 📦 Tech Stack

| Layer             | Technology                          |
| ----------------- | ----------------------------------- |
| **Framework**     | Next.js 16 (App Router + Turbopack) |
| **Runtime**       | Bun                                 |
| **Database**      | PostgreSQL + Prisma ORM             |
| **Visual Editor** | @crediblemark/build (CredBuild)     |
| **Testing**       | Vitest                              |
| **Styling**       | Tailwind CSS v4 + Vanilla CSS       |
| **Icons**         | Lucide React                        |

---

## 🏗️ Arsitektur (Modular Monolith + Event-Driven)

Aplikasi menggunakan **Modular Monolith** dengan **14 modul domain**. Setiap modul memiliki batas logis (logical boundaries) yang ketat dan **struktur folder 100% konsisten**. Komunikasi lintas modul dibatasi melalui:

- **Facade Pattern** (`XxxClient`): Kontrak publik setiap modul melalui `index.ts`
- **Event Bus** (Redis pub/sub): Komunikasi async lintas modul tanpa coupling
- **Kepatuhan dependency-cruiser**: Zero violations — semua dependency terverifikasi

### Path Aliases

| Alias                        | Modul                                        |
| ---------------------------- | -------------------------------------------- |
| `@/modules/auth/*`           | Autentikasi, user, affiliate                 |
| `@/modules/catalog/*`        | Produk, katalog, toko                        |
| `@/modules/domain/*`         | Domain kustom, verifikasi DNS                |
| `@/modules/financial/*`      | Kupon, komisi afiliasi, withdrawal           |
| `@/modules/infrastructure/*` | Provisioning, backup, storage                |
| `@/modules/media/*`          | Media, gallery, portfolio                    |
| `@/modules/notification/*`   | Email, WhatsApp, follow-up                   |
| `@/modules/order/*`          | Pesanan e-commerce, checkout                 |
| `@/modules/page/*`           | Pages, menu, content display, credbuild      |
| `@/modules/payment/*`        | Transaksi billing, payment gateway           |
| `@/modules/post/*`           | Blog, taxonomies, testimonial, search        |
| `@/modules/shared/*`         | Utility, hooks, themes, UI global, event bus |
| `@/modules/site/*`           | Site settings, analytics, contact            |
| `@/modules/subscription/*`   | Plans, subscriptions, platform settings      |

---

## 🏗️ Struktur Proyek

```
SitusBisnis-migration/
├── prisma/                 # Database schema (22 model, decoupled)
├── src/
│   ├── app/                # Routes & API (Next.js App Router)
│   │   ├── (site)/         # Tenant-facing: blog, shop, gallery, etc.
│   │   ├── (pages)/        # Marketing: landing, pricing, onboarding
│   │   ├── endpoints/      # ✅ JEMBATAN HTTP:
│   │   │   ├── routes.ts   # Routing table terpusat
│   │   │   └── [...route]/route.ts  # Catch-all handler
│   │   ├── dashboard/      # User dashboard
│   │   └── admin/          # Admin panel
│   │
│   └── modules/            # 14 Modular Monolith domain modules
│       ├── auth/           # Authentication, users, NextAuth
│       ├── catalog/        # Products, shop, catalog
│       ├── domain/         # Custom domain, DNS verification
│       ├── financial/      # Coupons, commissions, withdrawals
│       ├── infrastructure/ # Provisioning, backup, R2 storage
│       ├── media/          # Media library, gallery, portfolio
│       ├── notification/   # Email, WhatsApp, follow-up
│       ├── order/          # E-commerce orders, checkout
│       ├── page/           # Pages, menus, credbuild, content display
│       ├── payment/        # Billing transactions, Duitku
│       ├── post/           # Blog, taxonomies, testimonials, search
│       ├── shared/         # Utilities, hooks, themes, event bus
│       ├── site/           # Site settings, analytics, contact
│       └── subscription/   # Plans, subscriptions, platform settings
├── tests/                  # Unit (Vitest) & E2E (Playwright)
└── docs/                   # Dokumentasi teknis
```

### Struktur Modul (100% Konsisten!)

Setiap modul memiliki struktur folder **sama persis**:

```
modules/<domain>/
├── index.ts              # 🔑 Facade Client (kontrak publik)
├── public-actions.ts     # 🎯 Public Server Actions (wrapper untuk UI)
├── actions/              # 🔧 Internal Server Actions
├── controllers/          # 🔌 HTTP Controllers / Adapters
├── crud/                 # ⚙️ Konfigurasi CRUD (untuk model)
├── listeners/            # 👂 Event Bus Handlers
├── repositories/         # 💾 Data Access Layer (Prisma)
├── services/             # 🧠 Business Logic Layer
└── ui/                   # 🎨 Domain-specific UI Components
```

Modul yang memiliki direktori `crud/`:

- `catalog/crud/`: CRUD untuk `Product`
- `media/crud/`: CRUD untuk `GalleryItem` dan `PortfolioItem`
- `post/crud/`: CRUD untuk `Post`, `Testimonial`, dan `Taxonomy`

### Alur Request HTTP

```
Next.js route handler (src/app/endpoints/[...route]/route.ts)
  ↓
resolveEndpoint() dari routing table (src/app/endpoints/routes.ts)
  ↓
Controller / CRUD handler dari module bisnis
  ↓
Services / Repositories
  ↓
Response ke klien
```

---

## ✅ Architecture Compliance

| Check          | Status                                                    |
| -------------- | --------------------------------------------------------- |
| **TypeScript** | `tsc --noEmit` — 0 errors                                 |
| **Dependency** | `depcruise` — 0 violations, 360 modules, 919 dependencies |

---

## 🌐 Multi-Tenant System

Tenant detection via subdomain or custom domain:

```typescript
import { getSiteId, getTenant } from "@/modules/shared/utils/domains/tenant";

const siteId = await getSiteId(); // Guaranteed site isolation
```

---

## 📡 Event-Driven Architecture

Komunikasi async antar modul melalui event bus (Redis pub/sub):

```typescript
// Publish event
await eventBus.publish("billing.payment.completed", payload, "billing");

// Listen event (via listeners/index.ts)
eventBus.subscribe("billing.payment.completed", async (payload) => {
  // Handle payment completion
});
```

---

## 🔧 Development Guidelines

1. **Imports**: Use `@/` aliases only. No relative imports across modules.
2. **Cross-module**: Always use facade (`XxxClient`) or event bus. Never import internal services/repos.
3. **UI**: Import Server Actions hanya dari `public-actions.ts`, bukan dari `index.ts`.
4. **Database**: Only access via repositories layer. Never `db.` in controllers/services/ui.
5. **UI**: Module-specific UI goes in `ui/` folder within the module.
6. **Endpoint Baru**: Tambahkan di `src/app/endpoints/routes.ts`.
7. **Testing**: Unit tests in `tests/unit/`, E2E in `tests/e2e/`.

---

## 📄 License

Private - © 2026 Crediblemark

## 📚 Dokumentasi

Seluruh dokumentasi teknis ada di folder [docs/](docs/):

### 🏗️ Arsitektur

- [Analisis Arsitektur Modular Monolith (ID)](docs/ANALISIS-ARSITEKTUR-MODULAR-MONOLITH.md)
- [Status Migrasi API (ID)](docs/API-MIGRATION-STATUS.md)
- [Struktur CRUD (ID)](docs/CRUD-STRUCTURE.md)
- [Architecture Overview (EN)](docs/en/ARCHITECTURE.md) | [Tinjauan Arsitektur (ID)](docs/id/ARCHITECTURE.md)
- [Architecture Decision Records (EN)](docs/en/ARCHITECTURE_DECISIONS.md)

### 🚀 Operasional

- [Installation Guide (EN)](docs/en/INSTALLATION.md) | [Panduan Instalasi (ID)](docs/id/INSTALLATION.md)
- [Deployment Guide (EN)](docs/en/DEPLOYMENT.md) | [Panduan Deployment (ID)](docs/id/DEPLOYMENT.md)
- [Dokploy Deployment Guide (EN)](docs/en/dokploy-deployment-guide.md)
- [Operations Runbook (EN)](docs/en/RUNBOOK.md)

### 🔧 Standar

- [Testing Guide (EN)](docs/en/TESTING.md)
- [Contributing (EN)](docs/en/CONTRIBUTING.md)
- [Security Policy (EN)](docs/en/SECURITY.md)
- [Changelog (EN)](docs/en/CHANGELOG.md)

---

_Terakhir Diperbarui: 18 Juni 2026_

## 📋 Project Board & Roadmap

Setiap kali menyelesaikan pengembangan fitur atau perbaikan _bug_ di repositori ini, kontributor **DIWAJIBKAN** untuk memperbarui GitHub Project Board ([Situs Bisnis Roadmap](https://github.com/orgs/crediblemark-official/projects/1)).

1. Tambahkan fitur yang dikerjakan sebagai _Draft Issue_ di papan (jika belum ada).
2. Ubah status _Draft Issue_ tersebut menjadi **Done**.
3. Halaman rilis (`/roadmap`) pada situs utama membaca data dari _board_ ini secara langsung (_real-time_).
