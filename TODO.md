# FoodCop Project TODO

This document tracks pending features, technical debt, and client-requested integrations for the FUZO Studio v2.

## 🟢 Upcoming Features (Surgical Strike)

### 1. General Cleanup
*   [ ] Audit unnecessary files (referenced in `AUDIT_UNNECESSARY_FILES.md`).

---

## 🟡 In Progress
*   [ ] YouTube Channel Integration (Settings UI implemented, Verification pending).

---

## 🔴 Blocked / On Hold
*   **Meta (Facebook & Instagram) Integration**: Waiting for client to provide API keys (Client ID/Secret).
    *   [ ] Authentication setup in `AuthService.ts`
    *   [ ] `metaService.ts` and `meta-proxy` Edge Function
    *   [ ] Instagram Media Grid in `ProfileView.tsx`

---

## ✅ Completed (Recent Streak)

### 1. Leaderboard & Profile UI
*   [x] Replaced hardcoded profile placeholders with the unified `@Avatar` component.
*   [x] Fixed character encoding (mojibake) issues for rank emojis (🥇, 🥈, 🥉) and bullets (•).
*   [x] Implemented initials-based fallback for users without avatars.

### 2. Social Points System
*   [x] Enhanced `awardPointsForAction` in `index.tsx` with logging and immediate state sync.
*   [x] Fixed entity ID normalization for Scout-based saves to ensure points are correctly awarded.

### 3. Scout UI Refinements
*   [x] Improved **Overview** tab in `ScoutPlaceModal.tsx` with clearer labels and "Not Available" fallbacks.
*   [x] Condensed **Reviews** tab to a compact "Name + Rating" list to save space.

### 4. Supabase Synchronization
*   [x] Audited remote Supabase project `lgladnskxmbkhcnrsfxv`.
*   [x] Created local migration files (`024` to `030`) to sync repo history with remote state.
