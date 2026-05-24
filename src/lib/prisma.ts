import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Edge / Cloudflare Pages Worker note:
// The driver adapter pattern is what lets `@prisma/client` run on the
// Workers runtime — without it, Prisma's native query engine binary would
// fail to load. `nodejs_compat` (set in wrangler.jsonc) is what makes
// `pg` resolvable, since `pg` reaches into `node:net` / `node:tls`.
//
// We build a fresh client per isolate. Workers may reuse an isolate
// across requests inside the same instance, so we cache on globalThis to
// avoid recreating the Pool on every hot request. In Node.js dev this
// also stops Next.js HMR from leaking connections on every reload.

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
