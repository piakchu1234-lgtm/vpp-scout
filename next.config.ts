import type { NextConfig } from "next";

const isCloudBuild = !!(process.env.CI || process.env.VERCEL);

const nextConfig: NextConfig = {
  experimental: isCloudBuild
    ? {
        cpus: 1,
        workerThreads: false,
        memoryBasedWorkersCount: true,
      }
    : {
        memoryBasedWorkersCount: true,
      },

  // Optimize Mapbox GL JS for Turbopack
  transpilePackages: ['mapbox-gl'],

  // Turbopack configuration for Mapbox GL JS
  turbopack: {
    resolveAlias: {
      'mapbox-gl': 'mapbox-gl/dist/mapbox-gl.js',
    },
  },
};

export default nextConfig;
