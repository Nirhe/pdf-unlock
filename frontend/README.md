# PDF Unlock Frontend

This Vite + React project powers the public frontend for the PDF Unlock service. It communicates with the backend API (also deployed on Vercel) to upload PDF files, request document locking, and poll for job status updates.

## Local development

```bash
cd frontend
npm install
npm run dev
```

By default the development server will proxy API calls to the backend target defined in `vite.config.ts`. You can override the target by setting `VITE_API_BASE_URL` in a `.env.local` file.

## Deployment notes

The production site is deployed on Vercel. The `vercel.json` file configures rewrites so that requests to `/api/*` are forwarded to the backend deployment. Because Vercel rewrites happen at the edge, you must ensure that the destination host always resolves correctly.

When rolling out a new backend deployment, update the `PDF_UNLOCK_BACKEND_HOST` environment variable in the frontend project before shipping. This avoids a window where the rewrite points at an inactive host.

## Troubleshooting 502 errors from `/api/*`

A 502 “Bad Gateway” response from the Vercel edge usually means the rewrite target cannot be reached. Here are several options to diagnose and fix the issue:

1. **Verify the DNS record for the backend host.** Make sure the deployment hostname (e.g. `pdf-unlock-backend-git-main-yourteam.vercel.app`) still exists. You can run `nslookup <host>` or `dig <host>` locally. If Vercel deleted the deployment, create a new backend deployment and update the hostname.
2. **Fallback to a static rewrite during incidents.** Temporarily hard-code the known-good backend hostname inside `frontend/vercel.json` to remove the dependency on misconfigured environment variables:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/(.*)",
         "destination": "https://pdf-unlock-backend.vercel.app/api/$1"
       }
     ]
   }
   ```
   Redeploy the frontend after making the change. Once the incident is resolved, you can revert to the environment-variable driven configuration for flexibility.
3. **Use Vercel project-level environment variables.** Confirm that `PDF_UNLOCK_BACKEND_HOST` is defined in the **Project Settings → Environment Variables** section for the `Production` environment. If you want to make the host configurable per branch, add the same variable to `Preview` and `Development` environments.
4. **Guard against missing variables at build time.** Add a CI check or a runtime assertion (for example in `src/api/client.ts`) that throws a descriptive error when the base URL is empty. This fails fast instead of silently pointing at an invalid hostname.
5. **Add a health-check script to deployment pipelines.** After each deploy, run `curl -i https://<frontend-domain>/api/docs/lock` from CI. Alert on non-2xx/400 responses so you can react before users notice the failure.

Implementing one or more of these options should prevent future DNS-related 502 errors from the frontend rewrite.
