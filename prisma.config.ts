import { defineConfig } from 'prisma/config';
import { config as loadDotenv } from 'dotenv';

// Load .env.local explicitly. Next.js handles this for the app, but the
// Prisma CLI runs in its own process and only reads .env by default.
loadDotenv({ path: '.env.local' });

// Datasource URLs (DATABASE_URL pooled, DIRECT_URL non-pooled for
// migrations) are declared in prisma/schema.prisma via env(). This file
// just points the CLI at the schema and ensures .env.local is loaded.
export default defineConfig({
  schema: 'prisma/schema.prisma',
});
