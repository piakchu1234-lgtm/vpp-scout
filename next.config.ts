import type { NextConfig } from "next";

const isCloudBuild = !!(process.env.CI || process.env.VERCEL);

const nextConfig: NextConfig = {
  // pg-cloudflare is loaded by `pg` via a dynamic require only at runtime
  // on the Workers runtime (it provides the Workers-native TCP socket).
  // esbuild can't statically resolve it inside the Next/OpenNext bundle,
  // so we mark it external — Next leaves the require as a runtime lookup,
  // and node_modules ships the package to the Worker.
  serverExternalPackages: ['pg-cloudflare'],
  experimental: isCloudBuild
    ? {
        cpus: 1,
        workerThreads: false,
        memoryBasedWorkersCount: true,
      }
    : {
        memoryBasedWorkersCount: true,
      },
};

export default nextConfig;

// OpenNext Cloudflare dev-mode hook. Makes `getCloudflareContext()` and
// any wrangler-bound resources (KV, R2, D1) resolve during `next dev`
// using the same access pattern the production Worker uses. No-op at
// production build time — the adapter packages the app independently.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
