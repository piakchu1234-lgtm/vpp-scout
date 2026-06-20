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

  webpack: (config, { isServer }) => {
    // Fix Mapbox GL JS in client bundles
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'mapbox-gl': 'mapbox-gl/dist/mapbox-gl.js',
      };
    }
    return config;
  },
};

export default nextConfig;
