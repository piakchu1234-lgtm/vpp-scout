import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// OpenNext Cloudflare dev-mode hook. Makes `getCloudflareContext()` and
// any wrangler-bound resources (KV, R2, D1) resolve during `next dev`
// using the same access pattern the production Worker uses. No-op at
// production build time — the adapter packages the app independently.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
