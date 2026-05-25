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
};

export default nextConfig;
