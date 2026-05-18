# SimplySite — Project Guide for AI Agents

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
The product must remain hostable on **Cloudflare Pages' free tier** at **$0 ongoing cost**. Use static export `output: 'export'` or the `@cloudflare/next-on-pages` edge runtime. Avoid Node-only server actions or paid Vercel `next/image` optimization.

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