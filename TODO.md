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
