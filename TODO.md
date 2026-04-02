# FoodCop Project TODO

This document tracks pending features, technical debt, and client-requested integrations for the FUZO Studio v2.

## 🟢 Upcoming Features (Surgical Strike)

### 1. Meta (Facebook & Instagram) Integration
*   [ ] **Authentication**:
    *   [ ] Verify Facebook Client ID/Secret in Supabase Dashboard.
    *   [ ] Add Instagram as an OAuth provider in `AuthService.ts`.
    *   [ ] Add Instagram login button to `AuthView.tsx`.
*   [ ] **API Integration**:
    *   [ ] Create `metaService.ts` for Instagram Graph API.
    *   [ ] Set up Supabase Edge Function (`meta-proxy`) to handle API requests.
    *   [ ] Implement "Fetch Instagram Media" to pull user photos/reels into their profile.
*   [ ] **Settings UI**:
    *   [ ] Add "Connect Instagram" button in `SettingsView.tsx`.
*   [ ] **Status**: Partially Ready (Facebook UI/Logic is there; Instagram & API are missing).
*   [ ] **Client Clarification Needed**: Does the client want basic social login only, or deep media integration (fetching reels/photos)?

### 2. General Cleanup
*   [ ] Audit unnecessary files (referenced in `AUDIT_UNNECESSARY_FILES.md`).

---

## 🟡 In Progress
*   [ ] YouTube Channel Integration (Settings UI implemented, Verification pending).

---

## 🔴 Blocked / On Hold
*   None.
