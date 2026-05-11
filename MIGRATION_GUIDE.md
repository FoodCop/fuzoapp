# FUZO Architectural Migration Guide: Subdomain Split

This document outlines the steps required to finalize the separation of the **Cinematic Landing Page** (`fuzo.app`) and the **Core Application** (`app.fuzo.app`).

## 1. Project Structure

- **FUZO Landing**: Currently located in `../FUZO_LANDING`. This repo should be deployed to `fuzo.app`.
- **FUZO App**: Currently located in `FUZO_V2`. This repo should be deployed to `app.fuzo.app`.

---

## 2. Vercel Configuration (App Project)

In your new Vercel project for the **App**, ensure the following:

### Domains
- Add `app.fuzo.app`.
- (Optional) Remove `fuzo.app` if it was previously attached to this project.

### Environment Variables
| Variable | Value |
|----------|-------|
| `VITE_CORE_APP_URL` | `https://app.fuzo.app` |
| `VITE_LANDING_URL` | `https://fuzo.app` |
| `VITE_AUTH_REDIRECT_URL` | `https://app.fuzo.app` |
| `VITE_SUPABASE_URL` | (Your project URL) |
| `VITE_SUPABASE_ANON_KEY` | (Your anon key) |

---

## 3. Supabase Configuration

You must update your Supabase Auth settings to allow the new subdomain.

1. Go to **Authentication > URL Configuration**.
2. **Site URL**: Change this to `https://app.fuzo.app`.
3. **Redirect URLs**: Add the following:
   - `https://app.fuzo.app/auth/callback`
   - `https://app.fuzo.app/app`
   - `http://localhost:5173/auth/callback` (for local dev)

---

## 4. Google Cloud Console (OAuth)

If you are using Google Login, update your OAuth 2.0 Client IDs.

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Find your OAuth 2.0 Client ID for Fuzo.
3. **Authorized JavaScript origins**:
   - `https://app.fuzo.app`
   - `https://fuzo.app` (if needed for landing analytics)
4. **Authorized redirect URIs**:
   - `https://<your-supabase-project-id>.supabase.co/auth/v1/callback`

---

## 5. Summary of Code Changes

- `FUZO_V2/index.tsx`: Cleaned of all landing logic. Boots directly to Auth/Feed.
- `FUZO_V2/src/features/auth/lib/oauthRedirect.ts`: Refactored to prioritize the `app.fuzo.app` domain.
- `FUZO_LANDING/src/App.tsx`: Hardcoded redirect to `app.fuzo.app` on button click.

---

## Troubleshooting

### Redirect Loops
If you get stuck in a redirect loop, check that `isCoreAppDomain()` in `oauthRedirect.ts` correctly identifies your production domain. It currently checks against `app.fuzo.app`.

### "Unsafe Attempt" Errors
These have been resolved by moving to a standalone architecture. If they reappear, check if any scripts are trying to access `window.top` across the `fuzo.app` and `app.fuzo.app` boundary.
