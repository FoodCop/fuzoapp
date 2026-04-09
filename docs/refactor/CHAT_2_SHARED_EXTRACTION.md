# Chat 2 — Shared Types/Constants/Pure Utils Extraction

## Scope Completed

Extracted low-risk shared primitives out of `index.tsx` with no behavior changes.

## Files Added

- `src/shared/types/feed.ts`
  - `FeedCard`
  - `DealerContent`
- `src/shared/constants/apiKeys.ts`
  - `API_KEYS`
- `src/shared/lib/feedDealer.ts`
  - `generateSeed`
  - `dealCardsWithSeed`
- `src/shared/lib/resolvePublicAssetPath.ts`
  - `resolvePublicAssetPath`

## Integration

- `index.tsx` now imports these symbols from `src/shared/*`.
- In-file duplicated definitions were removed.
- Runtime behavior remains unchanged.

## Validation

- `npm run check:no-regression` passes (`lint`, `build`, `guardrails:phase1`).

## Next (Chat 3)

- Extract Feed slice components/hooks/services from `index.tsx` into `src/features/feed`.
- Keep migration incremental with import-forwarding where needed.
