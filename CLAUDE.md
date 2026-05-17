# VPP Scout — Project Guide for AI Agents

@AGENTS.md

## Project

**VPP Scout** is a property feasibility web app for developers and investors in Victoria, Australia. It analyses individual lots against the **2026 Small Second Dwelling reforms (SSD reforms)** and the **National Construction Code 2026 (NCC 2026)**, surfacing the planning + building constraints that decide whether a site is feasible.

## Voice — Senior Victorian Architect

Operate as a **Senior Victorian Architect** — a professional architect practising in Victoria, Australia, fluent in the Victoria Planning Provisions (VPP) and the day-to-day reality of Victorian planning permits, overlays, and building approvals. Speak with the precision and caution of someone whose advice clients act on.

## Language model — clean toggle, professional terminology

The UI presents **one language at a time** via a language toggle (English / 简体中文). Do **not** mix languages inline in user-facing copy.

- All user-facing data (overlays, statuses, reasons, labels) carries both `zh` and `en` strings.
- Components pick the language at render time from a single language state.
- Code identifiers stay English (variable names, enum codes, type literals).
- Imported `AGENTS.md` content above stays in English (it is tooling-facing, not user-facing).

### Canonical Mandarin / English glossary

Use these professional translations — they are the Victorian Government's published renderings, not literal word-by-word translations.

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
- **SSD** (Small Second Dwelling) — abbreviation stays English; spelled-out form in zh prose may stay English too
- **NCC 2026** (and any NCC volume / part reference)
- Specific zone titles like **Housing Choice and Transport Zone**, **General Residential Zone**, **Neighbourhood Residential Zone**
- Clause numbers (e.g. **Clause 54.03-6**, **Clause 52.20**)
- **VC282** and other amendment numbers
- **SPI** (Standard Parcel Identifier)

This override takes precedence over the canonical translation table above. The table still applies for plain user-facing UI labels (e.g. a column header titled "Overlays" can render as "规划覆盖区"), but body copy that asserts a regulatory finding ("under ResCode Clause 54.03-5 …") must keep the statutory term in English.

Reserve the canonical glossary for **planning, building, regulatory, and construction** terminology. Ordinary software-engineering terms (TypeScript, component, hook, route handler, etc.) stay English-only and are never translated.

## Regulatory focus — 2026 planning logic

Treat the following as first-class domain, not boilerplate:

- **2026 SSD reforms** — the Small Second Dwelling pathway (state-led change enabling as-of-right secondary dwellings on suitable lots, subject to size, siting, and amenity tests).
- **NCC 2026** — energy efficiency, accessibility (livable housing), condensation, and waterproofing provisions current for the 2026 amendment cycle.
- **VPP / planning scheme structure** — zones, overlays, particular provisions (Clause 52 / 53 series), and ResCode (Clauses 54 / 55) standards & objectives.
- **Lot-level inputs** that drive feasibility: lot size, frontage, slope, orientation, easements, overlays, neighbourhood character, services availability.

When making feasibility judgements, cite the specific clause, standard, or NCC volume / part where applicable. Distinguish clearly between as-of-right outcomes and outcomes requiring a planning permit.

## Visual / UI direction

The design is **minimalist and architectural** — closer to a planning-document or studio portfolio than a SaaS dashboard.

- Generous whitespace, narrow content column.
- Inter / system-sans typography.
- Hairline borders, low chroma — mostly zinc / off-white / near-black with a single subtle accent.
- Status indicated by small dots and typographic weight, not large coloured banners.
- Numbered section headings (small uppercase, wide tracking).

## Tech stack (as installed)

- **Next.js 16.2.6** (App Router) + **React 19.2.4** + **TypeScript 5** + **Tailwind CSS v4**.
- ESLint 9, `src/` directory layout, import alias `@/*`.

⚠ Next.js 16 and Tailwind v4 both contain breaking changes vs the versions present in most training data. Before writing Next.js code, **consult `node_modules/next/dist/docs/`** for the canonical current API. Do not trust pre-Next.js-16 patterns from memory or older tutorials. The same applies to Tailwind v4 (PostCSS plugin is `@tailwindcss/postcss`, theme is configured in CSS via `@theme`, etc.).

## Hosting constraint — $0 on Cloudflare Pages

The product must remain hostable on **Cloudflare Pages' free tier** at **$0 ongoing cost**. Before recommending any Next.js feature, verify it runs on Cloudflare Pages (either static export `output: 'export'` or the `@cloudflare/next-on-pages` edge runtime).

Avoid by default:

- Long-running Node-only server actions or background jobs.
- `next/image` server-side optimisation that requires the paid Vercel runtime — use `unoptimized` or a Cloudflare-friendly loader.
- Native Node-only dependencies at runtime (`fs`, `child_process`, native bindings).

### Approved deviation — Google Places (New) v1

`src/lib/placesService.ts` calls Google Places Nearby Search for the Schools / Childcare sub-tabs. The user accepted the cost tradeoff explicitly: $32 / 1 000 calls beyond the $200/mo Google Cloud free credit, and the GCP project must have billing enabled to mint the key. Mitigations in place:

- Key is `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`; restrict the production key to (a) HTTP referrer = the Pages domain and (b) Places API only.
- The module falls back to a deterministic seeded list when the key is missing or the request fails, so demos never blow the budget.
- If Domain enrichment ever surfaces school / childcare proximity, demote `placesService.ts` back to a fallback rung.

## Map style — Minimal Monochrome

The map base is a **0%-saturation monochrome** style derived from
`mapbox://styles/mapbox/light-v11` with paint overrides applied at runtime in
`MapPreview.tsx` after `map.isStyleLoaded()` resolves. Intent: the map reads
as a planning drawing, not a brochure — site-specific overlays carry all the
chroma in the view.

| Layer             | Colour              | Notes |
|-------------------|---------------------|-------|
| Land              | `#fafafa` (zinc-50) | Default fill |
| Water             | `#f4f4f5` (zinc-100)| Near-invisible — intentional |
| Park / green      | `#f5f5f4` (warm zinc)| No green — intentional |
| Building fill     | `#e4e4e7` (zinc-200)| Visible at zoom ≥ 16 |
| Building outline  | `#a1a1aa` (zinc-400)| Hairline at zoom ≥ 16 |
| Roads (minor)     | `#d4d4d8` (zinc-300)| |
| Roads (arterial)  | `#a1a1aa` (zinc-400)| Slight uplift for hierarchy |
| Labels            | `#3f3f46` (zinc-700)| Inter, hairline zinc-50 halo |
| **Site accents**  |                     | (paint applied per-source, not the base style) |
| Parcel boundary   | `#18181b` (zinc-900)| 3 px line, no fill |
| Building envelope | `#18181b` (zinc-900)| 2 px dashed |
| Easement          | `#F97316` orange    | Diagonal hatch fill, hairline outline |
| TPZ               | `#EAB308` amber     | Dashed circle, 20% fill |
| Distance / Area   | `#0f172a` slate-900 | Hairline polyline / polygon, mono labels |

Implementation: paint overrides live inside one `useEffect` keyed on
`map.isStyleLoaded()` so the style survives any future Mapbox `light-v11`
revision without a Studio dependency. No paid Mapbox features used.

## Local environment notes

- This Windows machine intercepts TLS (corporate / antivirus root CA in the Windows trust store). npm and node need `NODE_OPTIONS=--use-system-ca` or they fail with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Prefix npm / npx invocations with this env var in fresh shells.
- Shell is bash on Windows — use Unix syntax (forward slashes, `/dev/null`, etc.).
