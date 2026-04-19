# SKILLS.md

Operational knowledge pack for FUZO V2. Use this file as the fast-path briefing for future work sessions.

## 1. Repo Fundamentals

- Runtime entry: `index.tsx` (still large, but being reduced incrementally).
- Build stack: Vite + React + TypeScript.
- Core command set:
  - `npm run dev` (local app)
  - `npm run lint` (`tsc --noEmit`)
  - `npm run build` (production bundle)
- Deployment: Vercel via root `vercel.json`.

## 2. Auth + Onboarding Skill

### Purpose
Maintain safe auth behavior for sign-in, onboarding, and profile consistency.

### Key Facts
- Password auth is active:
  - email/password sign-in
  - auth-screen forgot-password flow
  - settings password update/reset actions
- OAuth redirect handling is centralized in:
  - `src/features/auth/lib/oauthRedirect.ts`
- Auth session synchronization:
  - `src/app/hooks/useAuthSessionSync.ts`

### Guardrails
- Do not hardcode redirect URLs; use helper functions.
- Keep local and production callback behavior aligned.
- Validate auth changes with both:
  - signed-out journey
  - existing-user sign-in journey

## 3. Feed + Dealer Normalization Skill

### Purpose
Keep feed transformations stable and type-safe across local and service data.

### Key Files
- `src/features/feed/lib/feedNormalization.ts`
- `src/shared/lib/feedDealer.ts`
- `src/features/feed/types/feedUi.ts`

### Guardrails
- Preserve stable ID strategy (`itemType-itemId`).
- Keep ad/trivia fallback injection behavior unchanged.
- Avoid introducing dynamic, unsafe casts during normalization.

## 4. Scout + Map Skill

### Purpose
Maintain Google Maps marker sync and place normalization behavior.

### Key Files
- `src/features/scout/types/scoutUi.ts`
- `src/features/scout/lib/scoutUtils.ts`
- Scout view logic in `index.tsx` (pending extraction)

### Guardrails
- Use `getGoogleMaps()` helper for runtime access.
- Keep place normalization resilient to missing fields.
- Ensure marker cleanup runs before re-sync to prevent leaks/duplication.

## 5. Plate Save/Restore Skill

### Purpose
Keep saved items consistent between UI model and persistence model.

### Key Files
- `src/features/plate/lib/savedItems.ts`
- `src/services/plateService.ts`
- `src/shared/types/appItem.ts`

### Guardrails
- Keep `normalizeItemForPlateSave()` compatible with `PlateItemType`.
- Keep location/metadata preservation for Scout round-trips.
- Never remove fallback-safe defaults in UI normalization.

## 6. Public Profile Viewing Skill

### Purpose
Support safe viewing of other users' profiles without regressing own-profile edit flows.

### Key Files
- Route wiring: `src/app/routes/renderAppView.tsx`
- URL sync: `src/app/hooks/useTabUrlSync.ts`
- Tab ids: `src/app/layout/navItems.ts`
- Public profile UI + entry points: `index.tsx`
- Public profile reads: `src/features/settings/services/settingsService.ts`
- Public saved items reads: `src/services/plateService.ts`
- Feed author identity normalization: `src/features/feed/lib/feedNormalization.ts`
- DB policy migration: `supabase/migrations/020_allow_authenticated_read_saved_items.sql`

### Guardrails
- Canonical target identifier is user UUID (`userId` query param).
- If `targetUserId === authUser.id`, route to own profile tab, not public-profile mode.
- Keep public mode read-only; do not expose settings mutations.
- Keep limited-shell fallback when target profile is missing/restricted.
- Preserve one-time telemetry logging for missing feed author IDs (avoid noisy repeated logs).

## 7. Proxy + Edge Function Skill

### Purpose
Keep AI proxy layers robust and typed while preserving API compatibility.

### Key Files
- Local server proxy: `server.ts`
- Supabase Gemini proxy: `supabase/functions/gemini-proxy/index.ts`
- Supabase OpenAI proxy: `supabase/functions/openai-proxy/index.ts`
- Frontend Gemini service: `src/services/geminiService.ts`

### Guardrails
- Keep keys server-side only; no client secret exposure.
- Keep response parsing null-safe for provider schema drift.
- Preserve legacy fields if existing clients depend on them.

## 8. UI Styling Skill (Tailwind Safety)

### Purpose
Prevent production CSS purge regressions and keep style behavior deterministic.

### Rules
- Prefer static class maps over dynamic templates like `bg-${color}-100`.
- If dynamic styling is unavoidable, add explicit safelist coverage in `tailwind.config.cjs`.
- Re-run build after style-system edits to catch purge issues early.

## 9. Chat + Notifications Integration Skill

### Purpose
Maintain the AAA full-screen chat experience and ensure notifications correctly deep-link into conversations.

### Key Files
- Layout Logic: `src/features/chat/components/ChatView.tsx`
- Notification Engine: `src/features/notifications/components/NotificationsView.tsx`
- Routing: `src/app/routes/renderAppView.tsx`

### Guardrails
- **Full-Screen Layout**: Ensure the `activeId` correctly toggles the mobile single-pane view.
- **Derived State**: Notifications must be derived from the `friends` list to ensure consistency with the chat unread counts.
- **Deep Linking**: Always clear `initialActiveId` once the chat view has successfully opened the target conversation to prevent state loops.

## 10. Refactor Execution Skill

### Purpose
Ship low-risk refactors without behavior regression.

### Workflow
1. Read target code path and define smallest safe batch.
2. Edit only one cohesive concern per batch.
3. Run `npm run lint` after each batch.
4. Keep fallbacks and error messages intact.
5. Push only when build + lint are both green.

## 11. Release Readiness Checklist

Before push/deploy:
- `npm run lint` passes.
- `npm run build` passes.
- SonarQube-reported issues for touched files are reviewed/resolved.
- No new secrets in tracked files.
- README reflects major behavior changes.
- If contracts changed, verify both frontend and edge proxy callers.

## 12. Current Active Priorities

- Complete and document 48-hour Trims rollout audit.
- Continue extracting large feature blocks out of `index.tsx`.
- Add focused smoke tests for critical user flows.
