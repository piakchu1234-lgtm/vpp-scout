import { defineConfig } from 'prisma/config';
import { config as loadDotenv } from 'dotenv';

// Load .env.local explicitly. Next.js handles this for the app, but the
// Prisma CLI runs in its own process and only reads .env by default.
loadDotenv({ path: '.env.local' });

// Prisma 7 requires connection URLs for the Migrate CLI to live here
// (no longer permitted in schema.prisma). The runtime client in
// src/lib/prisma.ts uses the pg driver adapter with DATABASE_URL.
// DIRECT_URL is Supabase's non-pooled channel for migrations.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
