import { defineConfig } from 'prisma/config';
import { config as loadDotenv } from 'dotenv';

// Load .env.local explicitly. Next.js handles this for the app, but the
// Prisma CLI runs in its own process and only reads .env by default.
loadDotenv({ path: '.env.local' });

// Prisma 7 moved datasource URLs out of schema.prisma. The CLI uses the
// `datasource.url` below for migrations / `db push` / introspection. At
// runtime the app uses the pg driver adapter in src/lib/prisma.ts with
// process.env.DATABASE_URL (the Supabase pooled URL), so DIRECT_URL here
// stays the dedicated migration channel.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
