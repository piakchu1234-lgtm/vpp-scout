import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Prisma 7 requires either a driver adapter or Accelerate at runtime —
// the legacy "URL in schema, default constructor" path is gone. We use
// the pg driver adapter (standard Node TCP) which works on Vercel's
// Node.js serverless runtime. Cached on globalThis so Next.js HMR in
// dev doesn't leak connections on every reload.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function buildPrisma(): PrismaClient {
  // During build time, database connection is not available.
  // Check if we're in a build context by checking if DATABASE_URL is missing.
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    // Return a mock PrismaClient during build time to prevent initialization errors
    console.warn('[Prisma] No database URL found - using mock client (likely during build)');
    return {} as PrismaClient;
  }

  try {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  } catch (error) {
    console.error('[Prisma] Failed to initialize client:', error);
    // Return mock on error to allow build to continue
    return {} as PrismaClient;
  }
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? buildPrisma();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
