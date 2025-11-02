# Vercel Deployment Fixes - Summary

This document summarizes the changes made to fix Vercel deployment issues.

## Issues Fixed

### 1. Backend Missing Vercel Configuration ✅
**Problem:** No `vercel.json` configuration file for serverless deployment.

**Solution:** Created `/backend/vercel.json` with proper serverless function configuration.

### 2. System Dependency (qpdf) Not Available ✅
**Problem:** Backend used `qpdf` binary which isn't available in Vercel serverless functions.

**Solution:** Replaced `qpdf` with `pdf-lib` JavaScript library in `/backend/src/services/pdf.service.ts`.
- Removed `spawn('qpdf')` calls
- Implemented PDF encryption using `pdf-lib`'s native encryption API
- 128-bit RC4 encryption with configurable permissions

### 3. Frontend Rewrite Configuration ✅
**Problem:** `vercel.json` used unsupported environment variable interpolation (`$PDF_UNLOCK_BACKEND_HOST`).

**Solution:** Updated `/frontend/vercel.json` with hardcoded backend URL.
- Changed from `https://$PDF_UNLOCK_BACKEND_HOST/api/$1`
- To: `https://pdf-unlock-backend.vercel.app/api/$1`
- Added build-time environment variable for frontend code

### 4. Prisma Serverless Configuration ✅
**Problem:** Prisma not configured for serverless database connections.

**Solution:** 
- Added `directUrl` to Prisma schema for connection pooling support
- Created `/backend/src/db/client.ts` with singleton pattern to prevent connection leaks
- Updated build scripts to generate Prisma client during deployment
- Created `.env.example` with required database URLs

### 5. Build Process ✅
**Problem:** Prisma client generation not included in build process.

**Solution:** Updated `/backend/package.json`:
- Build script: `npx prisma generate && tsc -p tsconfig.json`
- Added `postinstall` hook for automatic client generation

## Files Changed

### Backend
- ✅ `/backend/vercel.json` - Created
- ✅ `/backend/src/services/pdf.service.ts` - Replaced qpdf with pdf-lib
- ✅ `/backend/prisma/schema.prisma` - Added directUrl for connection pooling
- ✅ `/backend/src/db/client.ts` - Created serverless-compatible Prisma client
- ✅ `/backend/package.json` - Updated build scripts
- ✅ `/backend/.env.example` - Created
- ✅ `/backend/README.md` - Updated deployment info

### Frontend
- ✅ `/frontend/vercel.json` - Fixed rewrite configuration
- ✅ `/frontend/README.md` - Updated deployment instructions

### Documentation
- ✅ `/DEPLOYMENT.md` - Created comprehensive deployment guide
- ✅ `/CHANGES.md` - This file

## Next Steps

### Before Deploying Backend:

1. **Set up a PostgreSQL database with connection pooling:**
   - Recommended: [Neon](https://neon.tech) (free tier available)
   - Alternative: Supabase, PlanetScale, or any PostgreSQL with pgBouncer

2. **Configure environment variables in Vercel:**
   ```bash
   DATABASE_URL=postgresql://user:pass@host/db?pgbouncer=true
   DIRECT_DATABASE_URL=postgresql://user:pass@host/db
   NODE_ENV=production
   JWT_SECRET=your_secret_key
   # Add QB credentials if using QuickBooks integration
   ```

3. **Deploy backend:**
   ```bash
   cd backend
   vercel --prod
   ```

4. **Run database migrations:**
   ```bash
   DATABASE_URL=$DIRECT_DATABASE_URL npx prisma migrate deploy
   ```

### Before Deploying Frontend:

1. **Update backend URL in `/frontend/vercel.json`:**
   - Replace `pdf-unlock-backend.vercel.app` with your actual backend URL
   - Update both `destination` and `VITE_API_BACKEND_HOST`

2. **Deploy frontend:**
   ```bash
   cd frontend
   vercel --prod
   ```

## Testing Checklist

After deployment, verify:

- [ ] Backend health endpoint responds: `curl https://your-backend.vercel.app/api/health`
- [ ] Frontend loads: `curl https://your-frontend.vercel.app`
- [ ] API routes work through frontend: Test `/api/docs/lock` endpoint
- [ ] PDF encryption works correctly
- [ ] Database connections don't leak (monitor Vercel logs)
- [ ] CORS allows frontend domain

## Known Limitations

1. **File Storage:** Currently uses temp files. For production, consider:
   - Vercel Blob Storage
   - AWS S3
   - Cloudinary

2. **Database:** Free tier limits:
   - Neon: 512 MB storage, 1 GB data transfer
   - Supabase: 500 MB storage, 2 GB data transfer

3. **Vercel Limits:**
   - 10 second serverless function timeout (Hobby plan)
   - 50 MB deployment size limit
   - 4.5 MB request body size limit

## Rollback Plan

If deployment fails, you can rollback by:

1. Reverting to previous Vercel deployment in dashboard
2. Or reverting these Git commits and redeploying

## Support

For issues, check:
1. Vercel deployment logs
2. Database connection status
3. `/DEPLOYMENT.md` troubleshooting section
