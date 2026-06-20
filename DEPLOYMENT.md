# 🚀 SimplySite Production Deployment Guide

## ✅ Build Status: PASSING

```
✓ Production build successful
✓ TypeScript compilation passed
✓ All Prisma clients using singleton pattern
✓ API routes configured for dynamic rendering
✓ Environment variables documented
```

---

## 📋 Pre-Deployment Checklist

### 1. Database Setup (Supabase/Vercel Postgres)

**Option A: Supabase (Recommended)**

1. Create project at https://supabase.com
2. Go to Settings → Database
3. Copy **Connection Pooling** URL (port 6543) → `DATABASE_URL`
4. Copy **Direct Connection** URL (port 5432) → `DIRECT_URL`
5. Enable PostGIS extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

**Option B: Vercel Postgres**

1. Create database in Vercel dashboard
2. Copy connection strings from Settings
3. Pooled URL → `DATABASE_URL`
4. Direct URL → `DIRECT_URL`

### 2. Environment Variables

Copy `.env.example` to Vercel environment variables:

**Required:**
- `DATABASE_URL` - Pooled connection (for migrations)
- `DIRECT_URL` - Direct connection (for runtime with pg adapter)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk auth
- `CLERK_SECRET_KEY` - Clerk auth
- `NEXT_PUBLIC_MAPBOX_TOKEN` - 3D map rendering
- `GOOGLE_AI_API_KEY` - Gemini AI analysis
- `VICPLAN_API_KEY` - VicPlan spatial data

**Optional:**
- `DOMAIN_API_KEY` - Property market data
- `STRIPE_SECRET_KEY` - Payments (if enabled)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhooks

### 3. Prisma Migration

**Local:**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

**Production (Vercel):**
```bash
# In Vercel build settings, add to Build Command:
npx prisma generate && npx prisma migrate deploy && next build
```

Or use this package.json script:
```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

---

## 🔧 Vercel Configuration

### Project Settings

**Framework Preset:** Next.js

**Build Settings:**
- Build Command: `npm run vercel-build` (or custom command above)
- Output Directory: `.next` (default)
- Install Command: `npm install`

**Node.js Version:** 20.x (recommended)

### Environment Variables Setup

Add these in Vercel Dashboard → Settings → Environment Variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:6543/database?pgbouncer=true
DIRECT_URL=postgresql://user:password@host:5432/database

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...

# AI
GOOGLE_AI_API_KEY=AIzaSy...

# VicPlan
VICPLAN_API_KEY=your_key...

# Optional: Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Regions

Set deployment region to **Sydney (syd1)** for:
- Lower latency to Victorian government APIs
- Proximity to target users (Melbourne/Victoria)

---

## 🔒 Security Checklist

- ✅ All API keys stored in environment variables (not in code)
- ✅ Database URLs use SSL connections
- ✅ Clerk handles authentication securely
- ✅ No sensitive data in client-side code
- ✅ API routes validate inputs
- ✅ CORS configured properly
- ✅ Rate limiting implemented (Clerk middleware)

---

## 📊 Prisma Production Optimizations

### Connection Pooling

The app uses **two connection URLs** to optimize for Vercel's serverless environment:

1. **DATABASE_URL (Pooled):**
   - Used for: Prisma migrations
   - Connection: PgBouncer pooler (port 6543)
   - Benefits: Prevents connection exhaustion during deploys

2. **DIRECT_URL (Non-pooled):**
   - Used for: Runtime queries with `pg` adapter
   - Connection: Direct Postgres (port 5432)
   - Benefits: Required for Prisma 7 with driver adapters

### Prisma Client Initialization

The app uses a **singleton pattern** (`src/lib/prisma.ts`) to prevent:
- Connection leaks during Next.js hot reloading
- Multiple PrismaClient instances in production
- Build-time initialization errors

**Build-time safety:**
```typescript
if (!connectionString) {
  // Return mock during build (no DB access needed)
  return {} as PrismaClient;
}
```

### PostGIS Extension

**Required for spatial features:**
```sql
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify installation
SELECT PostGIS_version();

-- Create spatial index
CREATE INDEX property_parcels_geometry_idx 
ON property_parcels USING GIST (geometry);
```

---

## 🎯 Post-Deployment Verification

### 1. Health Checks

Visit these URLs after deployment:

- Homepage: `https://your-app.vercel.app`
- Map interface: `https://your-app.vercel.app/app`
- Projects dashboard: `https://your-app.vercel.app/projects`
- API health: `https://your-app.vercel.app/api/projects` (should return empty array)

### 2. Database Connection Test

Check Vercel logs for:
```
✅ No Prisma initialization errors
✅ API routes responding
✅ Queries executing successfully
```

### 3. Feature Testing

**Core Features:**
- ✅ Address search and geocoding
- ✅ VicPlan data fetching
- ✅ 3D massing generation
- ✅ ROI calculation
- ✅ Project save/load
- ✅ PDF export

**Authentication:**
- ✅ Sign up flow
- ✅ Sign in flow
- ✅ Protected routes

---

## 🐛 Common Issues & Solutions

### Issue: "Failed to collect page data for /api/*"

**Cause:** PrismaClient initializing during build without database connection

**Solution:** ✅ Already fixed - using singleton pattern with build-time safety

### Issue: "PrismaClient needs to be constructed with options"

**Cause:** Direct `new PrismaClient()` in multiple files

**Solution:** ✅ Already fixed - all imports use `import { prisma } from '@/lib/prisma'`

### Issue: Connection pool exhausted

**Cause:** Too many connections in serverless environment

**Solution:** 
- Use connection pooling (DATABASE_URL with pgbouncer)
- Implement connection management in Prisma singleton
- Consider Prisma Accelerate for high traffic

### Issue: PostGIS functions not working

**Cause:** PostGIS extension not enabled

**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

---

## 📈 Performance Optimizations

### 1. Database Indexes

Already implemented in schema:
```prisma
@@index([address])
@@index([suburb, postcode])
@@index([zoneCode])
@@index([lotArea])
@@index([createdAt])
```

### 2. Image Optimization

- Map snapshots stored as Base64 in database
- Next.js Image component for optimized loading
- WebGL canvas capture at optimal resolution

### 3. API Route Caching

```typescript
// Already configured
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
```

### 4. Static Generation

Static pages (no database access):
- Homepage (/)
- App shell (/app - hydrates after load)
- Projects page (/projects - hydrates after load)

Dynamic pages (database required):
- All API routes (/api/*)

---

## 🔄 CI/CD Pipeline

### GitHub Actions (Recommended)

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## 📊 Monitoring & Analytics

### Vercel Analytics

Enable in Vercel Dashboard → Analytics:
- Page view tracking
- Web Vitals (Core Web Vitals)
- Real User Monitoring (RUM)

### Database Monitoring

**Supabase:**
- Dashboard → Database → Performance
- Monitor query performance
- Check connection pool usage

**Vercel Postgres:**
- Dashboard → Storage → Postgres
- View metrics and logs

### Error Tracking (Optional)

Integrate Sentry:
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

---

## 🎊 Deployment Complete!

Your SimplySite production deployment is ready. The platform now offers:

✅ Property search & 3D analysis  
✅ AI-powered feasibility reports  
✅ Project management dashboard  
✅ Bilingual PDF exports  
✅ WebGL visualization capture  
✅ Enterprise-grade architecture  

**Next Steps:**
1. Test all features in production
2. Set up monitoring and alerts
3. Configure custom domain
4. Enable SSL certificate
5. Set up backup strategy

---

## 🆘 Support Resources

- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **PostGIS Docs:** https://postgis.net/documentation/

---

**Built with SimplySite Production Stack:**
- Next.js 15 (App Router + Turbopack)
- Prisma 7 (Driver Adapters)
- PostgreSQL + PostGIS
- Mapbox GL JS (3D Visualization)
- Google Gemini AI
- Clerk Authentication
- Tailwind CSS
