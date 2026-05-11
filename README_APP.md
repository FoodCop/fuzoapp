# FUZO App (Core)

This is the standalone core application for `app.fuzo.app`.

## Architecture Split

The landing page has been moved to a separate repository `FUZO_LANDING`. 
This repository now focuses exclusively on the application features and authentication.

### Key Changes
- **No Landing Page**: The app boots directly into the Auth/Feed flow.
- **Simplified Routing**: Removed all domain-aware rendering and cross-domain redirect guards.
- **Logout Behavior**: `handleSignOut` now redirects to `https://fuzo.app`.

## Deployment

Deploy this repository to Vercel and point the `app.fuzo.app` domain to it.
Ensure the following environment variables are set:
- `VITE_CORE_APP_URL`: `https://app.fuzo.app`
- `VITE_LANDING_URL`: `https://fuzo.app`
- `VITE_SUPABASE_URL`: (Your Supabase URL)
- `VITE_SUPABASE_ANON_KEY`: (Your Supabase Key)
