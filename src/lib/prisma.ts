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
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set — required for Prisma + pg adapter');
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? buildPrisma();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
