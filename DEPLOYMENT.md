# Vercel Deployment Guide

This guide explains how to deploy the PDF Unlock application to Vercel.

## Architecture

- **Frontend**: Vite + React app deployed as a static site
- **Backend**: Express.js API deployed as serverless functions
- **Database**: PostgreSQL with connection pooling (required for serverless)

## Prerequisites

1. Vercel account
2. PostgreSQL database with connection pooling support (e.g., Neon, Supabase, PlanetScale)
3. QuickBooks API credentials (if using QB integration)

## Backend Deployment

### 1. Database Setup

You need a PostgreSQL database with **connection pooling** for serverless compatibility.

**Recommended providers:**
- [Neon](https://neon.tech) - Free tier with connection pooling
- [Supabase](https://supabase.com) - Free tier with connection pooling
- [PlanetScale](https://planetscale.com) - MySQL alternative

**Environment Variables Required:**
```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname?pgbouncer=true
DIRECT_DATABASE_URL=postgresql://user:password@host:5432/dbname
NODE_ENV=production
PORT=3000

# QuickBooks (if using)
QB_CLIENT_ID=your_qb_client_id
QB_CLIENT_SECRET=your_qb_client_secret
QB_REDIRECT_URI=your_redirect_uri
QB_ENVIRONMENT=sandbox # or production

# JWT Secret
JWT_SECRET=your_jwt_secret_key
```

**Important:**
- `DATABASE_URL` should use the **pooled connection** (with pgbouncer or similar)
- `DIRECT_DATABASE_URL` should use the **direct connection** (for migrations)

### 2. Deploy Backend to Vercel

```bash
cd backend

# Install Vercel CLI if not already installed
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

**During deployment:**
1. Link to existing project or create new one
2. Set the **Root Directory** to `backend`
3. Override build command: `npm run build && npx prisma generate`
4. Override output directory: `dist`
5. Add all environment variables from above

**After first deployment:**
1. Run migrations: `npx prisma migrate deploy` (use DIRECT_DATABASE_URL)
2. Note the deployment URL (e.g., `pdf-unlock-backend.vercel.app`)

### 3. Vercel Project Settings

In your Vercel project dashboard:

**Build & Development Settings:**
- Framework Preset: `Other`
- Build Command: `npm run build && npx prisma generate`
- Output Directory: `dist`
- Install Command: `npm install`

**Environment Variables:**
Add all the variables listed above in the "Environment Variables" section.

## Frontend Deployment

### 1. Update Backend URL

Before deploying the frontend, update the backend URL in `frontend/vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://YOUR-BACKEND-URL.vercel.app/api/$1"
    }
  ],
  "env": {
    "VITE_API_BACKEND_HOST": "YOUR-BACKEND-URL.vercel.app"
  }
}
```

Replace `YOUR-BACKEND-URL` with your actual backend deployment URL.

### 2. Deploy Frontend to Vercel

```bash
cd frontend

# Deploy
vercel --prod
```

**During deployment:**
1. Link to existing project or create new one
2. Set the **Root Directory** to `frontend`
3. Framework will auto-detect as Vite
4. No additional environment variables needed (backend URL is in vercel.json)

### 3. Vercel Project Settings

**Build & Development Settings:**
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## Post-Deployment

### 1. Test the Deployment

```bash
# Test backend health
curl https://your-backend.vercel.app/api/health

# Test frontend
curl https://your-frontend.vercel.app
```

### 2. Update Frontend if Backend URL Changes

If you redeploy the backend and the URL changes:
1. Update `frontend/vercel.json` with the new backend URL
2. Redeploy the frontend

## Troubleshooting

### Backend Issues

**"Cannot find module '../generated/prisma'"**
- Solution: Ensure `npx prisma generate` runs during build
- Check build command includes: `npm run build && npx prisma generate`

**Database connection errors**
- Verify `DATABASE_URL` uses connection pooling
- Check `DIRECT_DATABASE_URL` is set correctly
- Ensure database allows connections from Vercel IPs

**"qpdf not found" errors**
- This should not happen after the fix - we replaced qpdf with pdf-lib
- If you see this, ensure you deployed the updated code

### Frontend Issues

**502 Bad Gateway on /api/* routes**
- Verify backend URL in `frontend/vercel.json` is correct
- Check backend deployment is live and healthy
- Ensure backend URL doesn't have trailing slash

**CORS errors**
- Check backend CORS configuration allows frontend domain
- Verify `Access-Control-Allow-Origin` headers

## Monorepo Alternative

If you prefer to deploy both from a single Vercel project:

1. Create `vercel.json` in the root:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "frontend/dist"
      }
    },
    {
      "src": "backend/dist/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/dist/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/dist/$1"
    }
  ]
}
```

2. Deploy from root: `vercel --prod`

**Note:** This approach is more complex and may require additional configuration.

## Environment Variables Reference

### Backend Required
- `DATABASE_URL` - Pooled PostgreSQL connection
- `DIRECT_DATABASE_URL` - Direct PostgreSQL connection
- `NODE_ENV` - Set to "production"
- `JWT_SECRET` - Secret key for JWT tokens

### Backend Optional (QuickBooks)
- `QB_CLIENT_ID`
- `QB_CLIENT_SECRET`
- `QB_REDIRECT_URI`
- `QB_ENVIRONMENT`

### Frontend
- `VITE_API_BACKEND_HOST` - Set in vercel.json (build-time only)

## Maintenance

### Database Migrations

When you need to run migrations:

```bash
# Using direct connection
DATABASE_URL=$DIRECT_DATABASE_URL npx prisma migrate deploy
```

### Updating Dependencies

```bash
# Backend
cd backend
npm update
npm run build
vercel --prod

# Frontend
cd frontend
npm update
npm run build
vercel --prod
```

## Security Checklist

- [ ] Database credentials are in environment variables (not committed)
- [ ] JWT_SECRET is strong and unique
- [ ] CORS is configured to allow only your frontend domain
- [ ] Database uses SSL connections
- [ ] API rate limiting is configured (if needed)
- [ ] File upload size limits are set (currently 10MB)

## Cost Optimization

**Vercel Free Tier Limits:**
- 100GB bandwidth/month
- 100 hours serverless function execution/month
- 6,000 minutes build time/month

**Database:**
- Use free tier of Neon or Supabase for development
- Monitor connection pool usage
- Consider upgrading for production workloads

## Support

For issues:
1. Check Vercel deployment logs
2. Check database connection status
3. Review this troubleshooting guide
4. Contact support with specific error messages
