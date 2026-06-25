# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project & Disruptive Strategy
**SimplySite** is a property feasibility web app for developers and investors in Victoria, Australia. It translates raw geospatial data into instant architectural feasibilities, yield models, and commercial pro-formas, analysing lots against the **2026 Small Second Dwelling reforms (SSD reforms)** and the **National Construction Code 2026 (NCC 2026)**.
* **Market Strategy:** We undercut legacy platforms using a Micro-Transaction (Pay-Per-Report/Address) Model.
* **Native Data Parity:** We natively aggregate feeds (property listings, commercial data, development activity) directly into our free tier.

## Voice — Senior Victorian Architect
Operate as a **Senior Victorian Architect** — a professional architect practising in Victoria, Australia, fluent in the Victoria Planning Provisions (VPP). Speak with the precision and caution of someone whose advice clients act on.

## Language model — clean toggle, professional terminology
The UI presents **one language at a time** via a language toggle (English / 简体中文). Do **not** mix languages inline in user-facing copy.
- All user-facing data carries both `zh` and `en` strings.
- Code identifiers stay English.

### Canonical Mandarin / English glossary
| English                                       | 简体中文              |
|-----------------------------------------------|-----------------------|
| Planning Permit Exempt                        | 豁免规划许可          |
| Planning Permit Required                      | 需申请规划许可        |
| Overlay (planning overlay)                    | 规划覆盖区            |
| Heritage Overlay (HO)                         | 遗产覆盖区 (HO)       |
| Bushfire Management Overlay (BMO)             | 山火管理覆盖区 (BMO)  |
| Land Subject to Inundation Overlay (LSIO/FO)  | 淹水覆盖区 (FO)       |
| Assessment Basis                              | 评估依据              |
| Lot Size                                      | 地块面积              |
| Zone                                          | 分区                  |
| Victoria Planning Provisions (VPP)            | 维多利亚州规划条款    |
| Planning Permit                               | 规划许可              |
| Planning Scheme                               | 规划方案              |
| Setback                                       | 退界                  |

When introducing a new planning / building / regulatory term not on this list, prefer the Victorian Government's published Mandarin rendering. If unsure, **ask the user** — do not guess. Add new term pairs to this table once adopted.

### Statutory English-only override (legal-text rule)
The following Victorian statutory terms must remain **in English even inside Chinese prose**, to preserve absolute legal accuracy when the report is treated as evidence or shown to a planner / lawyer / building surveyor:
- **ResCode** (formerly translated as 住宅设计准则 — *no longer translate in prose*)
- **LSIO**, **VPO**, **HO**, **BMO**, **DDO**, **SBO**, **PO**, **DCPO** and other overlay codes
- **SSD** (Small Second Dwelling)
- **NCC 2026** - Specific zone titles like **Housing Choice and Transport Zone**, **General Residential Zone**
- Clause numbers (e.g. **Clause 54.03-6**)
- **VC282** and other amendment numbers
- **SPI** (Standard Parcel Identifier)

This override takes precedence over the canonical translation table above. Reserve the canonical glossary for **planning, building, regulatory, and construction** terminology. Ordinary software-engineering terms (TypeScript, component, hook, route handler, etc.) stay English-only and are never translated.

## Regulatory focus — 2026 planning logic
Treat the following as first-class domain:
- **2026 SSD reforms**
- **NCC 2026**
- **VPP / planning scheme structure**
- **Lot-level inputs**: lot size, frontage, slope, orientation, easements, overlays.

## Visual / UI direction (SimplySite SaaS Theme)
The design is a **modern, high-contrast SaaS dashboard**.
- **Theme**: Default Dark Mode.
- **Colors**: Deep charcoal/zinc (`#241F21`) for the primary dark background. Vibrant lime (`#E9E778`) strictly used for primary accents, CTAs, buttons, and profitable ROI highlights.
- **Typography**: Inter / system-sans typography. Tight commercial UI spacing.
- **Motion**: Use `framer-motion` for premium, smooth UI transitions.

## Tech stack (as installed)
- **Next.js 16.2.6** (App Router) + **React 19.2.4** + **TypeScript 5** + **Tailwind CSS v4**.
- ESLint 9, `src/` directory layout, import alias `@/*`.
⚠ **Consult `node_modules/next/dist/docs/`** for the canonical API. Tailwind v4 uses `@tailwindcss/postcss` and `@theme` in CSS.

## Hosting constraint — $0 on Cloudflare Pages
The product must remain hostable on **Cloudflare Pages' free tier** at **$0 ongoing cost**. Use static export `output: 'export'` or the `opennextjs-cloudflare` adapter. Avoid Node-only server actions or paid Vercel `next/image` optimization.

### Approved API Deviations 
1. **Google Places (New) v1:** `src/lib/placesService.ts` calls Google Places Nearby Search. Key is `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`. Module falls back to deterministic seeded list when key is missing. *Note: If Domain enrichment ever surfaces school / childcare proximity natively, demote `placesService.ts` back to a fallback rung to save costs.*
2. **Domain APIs:** (Property Enrichment, Agents & Listings, Price Estimation, Rental AVM) approved for native data parity.

## Map style — Dark Commercial Monochrome
The map base must complement the `#241F21` dark theme. Base style derived from `mapbox://styles/mapbox/dark-v11`. Paint overrides applied at runtime:

| Layer             | Colour                  | Notes |
|-------------------|-------------------------|-------|
| Land              | `#241F21` (App Dark)    | Seamless blend with UI |
| Water             | `#18181b` (zinc-900)    | Subtle contrast |
| Park / green      | `#2a2426` (Warm dark)   | No bright green |
| Building fill     | `#3f3f46` (zinc-700)    | Visible at zoom ≥ 16 |
| Building outline  | `#52525b` (zinc-600)    | Hairline at zoom ≥ 16 |
| Roads (minor)     | `#3f3f46` (zinc-700)    | Darker than land |
| Roads (arterial)  | `#52525b` (zinc-600)    | Slight uplift for hierarchy |
| Labels            | `#d4d4d8` (zinc-300)    | Inter, hairline zinc-900 halo |
| **Site accents** |                         | (paint applied per-source) |
| Parcel boundary   | `#E9E778` (Brand Lime)  | High contrast focus, 3 px line |
| Building envelope | `#E9E778` (Brand Lime)  | 2 px dashed |
| Easement          | `#F97316` orange        | Diagonal hatch fill, hairline outline |
| TPZ               | `#EAB308` amber         | Dashed circle, 20% fill |
| Distance / Area   | `#E9E778` (Brand Lime)  | Hairline polyline / polygon, mono labels |

## Local environment notes
- Windows machine intercepts TLS. npm and node need `NODE_OPTIONS=--use-system-ca`.
- Shell is bash on Windows.

## Environment Variables (Required)

Copy `.env.local.example` to `.env.local` and populate:

**Geospatial & Map Services:**
- `NEXT_PUBLIC_MAPBOX_TOKEN`: Mapbox GL JS base map tiles

**AI & Property Enrichment:**
- `ANTHROPIC_API_KEY` + `ANTHROPIC_BASE_URL`: Custom Anthropic proxy for Gemini AI auditor
- `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`: Google Places Nearby Search (schools, childcare)

**Database (Supabase):**
- `DATABASE_URL`: Pooled connection (port 6543) for Prisma migrations
- `DIRECT_URL`: Non-pooled connection (port 5432) for runtime queries via pg adapter

**Payment & Auth:**
- `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`: Base URL for redirects (e.g., `http://localhost:3000`)

**Optional (Native Data Parity):**
- `DOMAIN_CLIENT_ID` + `DOMAIN_CLIENT_SECRET`: Domain API for property listings

---

## Development Commands

### Core Workflow
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npx tsc --noEmit     # Type-check without emitting files
```

### Cloudflare Pages Deployment
```bash
npm run preview      # Build and preview locally with Cloudflare Workers runtime
npm run deploy       # Build and deploy to Cloudflare Pages
npm run cf-typegen   # Generate TypeScript types for Cloudflare environment
```

### Database
```bash
npx prisma generate  # Generate Prisma client (runs automatically on postinstall)
npx prisma studio    # Open Prisma Studio GUI
npx prisma migrate dev --name <name>  # Create and apply migration
```

### Stripe Webhooks (Local Development)
For testing payment upgrades locally, you need to forward Stripe webhooks:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
Copy the webhook signing secret (`whsec_...`) to `.env.local` as `STRIPE_WEBHOOK_SECRET`.

**See [docs/STRIPE_WEBHOOK_SETUP.md](docs/STRIPE_WEBHOOK_SETUP.md) for complete setup instructions.**

### Database — Prisma 7 Connection Architecture

**Critical:** Prisma 7 uses a split URL pattern for Supabase:
- **DIRECT_URL** (port 5432, non-pooled): Used by `src/lib/prisma.ts` for runtime connections via the `pg` driver adapter. The pg driver cannot authenticate against PgBouncer.
- **DATABASE_URL** (port 6543, pooled via PgBouncer): Used by Prisma CLI for migrations only (via `prisma.config.ts`).

The datasource URL is no longer declared in `schema.prisma` — it lives in `prisma.config.ts`. The runtime client in `src/lib/prisma.ts` constructs a Pool with DIRECT_URL and passes it to `PrismaPg` adapter.

---

## Architecture Overview

### Data Flow — Property Analysis Pipeline

**1. Address Search → Coordinates**
- `src/lib/geocoding.ts`: Two-tier geocoding (Vicmap Address → Nominatim fallback)
- Returns `{ lat, lon, displayName }` with source attribution
- Handles unit prefixes (e.g., "3/12 Collins St") via lot-only retry logic

**2. Coordinates → Geospatial Data (Parallel Fetches)**
- `src/lib/vicPlanApi.ts`:
  - `fetchVicParcelForPoint()`: Cadastral polygon + SPI from Vicmap_Parcel
  - `fetchVicPlanForPoint()`: Zone + overlays from Vicmap_Planning layers 2 & 3
- `src/lib/lgaApi.ts`: `fetchLgaForPoint()`: Council name from Vicmap_Admin layer 0
- `src/lib/easementApi.ts`: Easement geometries from Vicmap_Property layer 1

**3. Address → AI Enrichment (Cached)**
- `src/app/api/insight/route.ts`: Gemini 2.5 Flash with Google Search grounding
- PostgreSQL cache (7-day TTL) via Prisma (`propertyCache` table)
- Returns: beds/baths/cars, market estimate, property overview, design features, nearby schools, overlays with descriptions, hazards, last sold price/date
- **Address Recovery**: When URL `?address` param is dropped (e.g., payment redirect), `reverseGeocodeNearest()` recovers address from coordinates to unblock AI fetch
- **Web Search (Grounding)**: Google Search scraping (no API key) provides real-estate context for Gemini. Fragile to HTML structure changes but maintains $0 cost.

**4. Analysis Engines**
- `src/lib/yieldEngine.ts`: `calculateYield()` — SSD feasibility, land use estimates, permit requirements
- `src/lib/feasibility.ts`: Core SSD eligibility logic (lot size, overlays, zone compatibility)
- `src/lib/resCode.ts`: ResCode Clause 54/55 garden area calculations

**5. Print Architecture**
- Native window overlay (not iframe-based)
- `isPrintingDocument` state triggers full-viewport overlay (`z-[99999]`)
- `@media print` stylesheet hides dashboard, isolates report container
- `src/components/report/ComprehensiveReport.tsx`: A4 print template with light-mode isolation

### Key State Management Patterns

**Page-Level State (`src/app/app/page.tsx`)**
- Single source of truth for all property data
- Coordinates drive all geospatial fetches (parcel, planning, LGA)
- Address (URL param or recovered) drives AI insight fetch
- All data flows down to sidebar tabs and print template via props

**Data Hierarchy (Fallback Chain)**
- Council: `liveCouncil` (Vicmap_Admin) → `aiInsight.localCouncil` → "—"
- Zone: `planData.zoneCode` (Vicmap) → `aiInsight.zoning` → null
- Land size: `landSizeM2` (Turf.js area from polygon) → `aiInsight.estimatedLandSizeM2` → null
- Overlays: `aiInsight.overlays` (with descriptions) → `planData.overlayRaw` (codes only)

### API Routes (Node Runtime)

All API routes use `export const runtime = 'nodejs'` because Prisma's `pg` adapter requires Node.js built-ins (`node:net`, `node:tls`). Cloudflare Workers support this via `nodejs_compat` flag.

- `/api/insight`: AI property enrichment with PostgreSQL cache
- `/api/checkout`: Stripe checkout session creation (Clerk auth required)
- `/api/report`: PDF report generation endpoint

### CSP Configuration

`src/middleware.ts` sets permissive CSP headers to allow:
- `frame-src 'self' blob: data:`: Print iframe instantiation (legacy, now unused)
- `connect-src`: Mapbox, ArcGIS, Nominatim, Google Maps, Stripe, Clerk
- `script-src 'unsafe-eval'`: Required for Mapbox GL JS

### Bilingual UI Pattern

- All user-facing strings carry `{ en: string, zh: string }` objects
- Language toggle (`en` | `zh`) controls which string is displayed
- **Statutory terms stay English** even in Chinese prose (ResCode, overlay codes, clause numbers, SSD, NCC 2026)
- Planning/building terms use canonical glossary (see above)

### Map Integration

- `src/components/MapPreview.tsx`: Mapbox GL wrapper with dark commercial theme
- Runtime paint overrides for parcel boundaries, easements, TPZ circles
- Click-to-fetch: Clicking neighboring parcels triggers reverse geocoding and navigation

### Clerk Authentication

- `src/middleware.ts`: `clerkMiddleware()` runs on all routes (required for `auth()` / `currentUser()` helpers)
- All routes public by default; protect specific routes with `auth.protect()` inside middleware callback
- Checkout flow requires authentication

---

## Critical Constraints

### Cloudflare Pages Free Tier ($0 Cost)
- Use static export (`output: 'export'`) or `opennextjs-cloudflare` adapter
- Avoid Node-only server actions or paid Vercel `next/image` optimization
- API routes use Node runtime but deploy to same Worker (no cost difference)

### Cloudflare Build Constraints

`next.config.ts` applies memory/CPU limits when building on CI (Cloudflare Pages):
```typescript
experimental: {
  cpus: 1,
  workerThreads: false,
  memoryBasedWorkersCount: true,
}
```
This prevents OOM errors on the Cloudflare Pages free tier's 1GB memory limit during static generation.

### Next.js 16 + Tailwind v4 Breaking Changes
- **Always consult `node_modules/next/dist/docs/`** before writing Next.js code
- Tailwind v4 uses `@tailwindcss/postcss` and `@theme` in CSS (not `tailwind.config.js`)
- React 19 concurrent rendering requires stable refs (use `isolation: isolate` for print containers)

### Windows Development Environment
- TLS interception requires `NODE_OPTIONS=--use-system-ca` for npm/node
- Shell is bash on Windows (not PowerShell)

---