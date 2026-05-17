// OpenNext adapter configuration for Cloudflare Workers.
//
// `@opennextjs/cloudflare` produces a single Worker bundle from the
// Next.js 16 build output, replacing the legacy `@cloudflare/next-on-pages`
// pipeline which cannot handle Next.js 16's Node-runtime Proxy.
//
// Bundle output lands in `.open-next/worker.js`; the wrangler.jsonc
// `main` entry points there. Local dev still uses `next dev`, and the
// `next.config.ts` `initOpenNextCloudflareForDev` hook makes
// `getCloudflareContext()` available during development so bindings
// (KV, R2, D1) resolve the same way they do in production.

import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig({
  // Incremental cache disabled by default — the app has no fetch-cache
  // dependencies (every dynamic call is to ArcGIS / Domain / Stripe and
  // already passes cache: 'no-store' upstream). Enable here when a KV
  // namespace or R2 bucket is wired in wrangler.jsonc.
});
