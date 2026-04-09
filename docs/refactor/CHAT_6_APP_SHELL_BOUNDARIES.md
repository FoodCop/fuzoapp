# Chat 6 — App Shell + Routing/Layout Boundaries + Hooks/Effects Separation

## Scope Completed

Extracted app-shell boundaries from `index.tsx` into `src/app/*` while preserving behavior.

## Files Added

- `src/app/bootstrap/mountApp.tsx`
- `src/app/layout/navItems.ts`
- `src/app/routes/renderAppView.tsx`
- `src/app/hooks/useAuthSessionSync.ts`
- `src/app/hooks/useSavedItemsOnAuth.ts`
- `src/app/hooks/useTabUrlSync.ts`

## Integration

- `index.tsx` now consumes app-shell modules for:
  - navigation metadata and initial-tab resolution
  - route rendering switch logic
  - auth/session effect wiring
  - authenticated saved-items load effect
  - URL/tab synchronization effect
  - root app mounting
- Existing runtime behavior and UX remain unchanged.

## Validation

- `npm run check:no-regression` passes (`lint`, `build`, `guardrails:phase1`).

## Next (Chat 7)

- Add lazy loading / chunking boundaries and finalize refactor docs/conventions.
