# Project Status: FUZO V2 Handover (Post Phase 5)

## Summary of Completed Work
We have just finished a high-impact development cycle covering **Phase 4 (Social Connectivity)** and **Phase 5 (Subdomain Migration)**.

### Phase 4: Social Sync & Advanced Messaging
- **Meta Integration**: `MetaService.ts` is ready; `OnboardingV2Flow` is wired to Facebook/Instagram OAuth.
- **Social Grid**: `SocialGrid.tsx` is integrated into the profile to display Instagram media.
- **Event Persistence**: Created `event_rsvps` table and `RSVPService.ts`. `EventInviteCard` is now fully functional with persistent attendance tracking in chat.

### Phase 5: Subdomain Separation (fuzo.app vs app.fuzo.app)
- **Domain Routing**: The app now detects `hostname` at boot.
- **Landing Mode**: `fuzo.app` renders *only* the cinematic intro and redirects "Get Started" to the app subdomain.
- **Core App Mode**: `app.fuzo.app` bypasses the intro and triggers Auth/Feed immediately.
- **Local Testing**: Toggle modes via `?mode=landing` or `?mode=app` on localhost.

## Immediate Actions for Next Chat
These are the environment-level steps required to finalize the migration:

1. **DNS Setup**: 
   - Add a new **CNAME** record:
     - **Type**: `CNAME`
     - **Name**: `app`
     - **Target**: `da6fb9f71710137b.vercel-dns-017.com`
   - In **Vercel Dashboard**, add `app.fuzo.app` to the project domains.

2. **OAuth URI Whitelisting**:
   - Update **Supabase Dashboard** -> Auth -> URL Configuration.
   - Update **Google Cloud Console** -> APIs & Services -> Credentials.
   - Update **Meta for Developers** -> Facebook Login -> Settings.
   - **New Redirect URI**: `https://app.fuzo.app/auth/callback`
3. **Environment Verification**:
   - Verify that `.env` on the production server has `VITE_CORE_APP_URL` and `VITE_LANDING_URL` correctly set.

### Chat System Debugging
- **Crash Fix**: Resolved missing Lucide icon imports in `ChatView.tsx` (LayoutGrid, X, Search, ChevronLeft, Eye, Bookmark).
- **Typing Status**: Fixed a logic bug that prevented typing indicators from showing in group chats.
- **Routing Parity**: Implemented `getCoreAppUrl()` and `getLandingUrl()` in `oauthRedirect.ts` to ensure local development properly toggles modes without redirecting to production subdomains.

## Current Roadmap Status
- [x] Phase 1: Core UX & Map Fixes
- [x] Phase 2: Profile & Notifications
- [x] Phase 3: Enhanced Discovery & AI Imports
- [x] Phase 4: Social Sync & Connectivity
- [x] Phase 5: Subdomain Migration
- [x] Chat Debugging & Realtime Polish

## Technical Notes
- The `index.tsx` file has been significantly updated with domain-aware early returns.
- `AuthOrchestrator` has been optimized to handle the cross-domain transition.
- Use `npm run build` to verify production integrity after any logic changes.

**Handover complete. Ready for environment verification and live testing.**
