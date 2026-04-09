# Chat 3 — Feed Slice Extraction

## Scope Completed

Moved Feed slice primitives from `index.tsx` into `src/features/feed` without changing behavior.

## Files Added

- `src/features/feed/types/feedUi.ts`
  - `FeedUiItemType`
  - `FeedUiItem`
- `src/features/feed/constants/config.ts`
  - `FEED_USE_SERVICE`
  - `FEED_COMPARE_WITH_LOCAL`
- `src/features/feed/constants/curatedFeed.ts`
  - `LOCAL_CURATED_FEED_ITEMS`
- `src/features/feed/services/feedService.ts`
  - `FeedService`
- `src/features/feed/services/feedLocation.ts`
  - `getUserFeedLocation`
- `src/features/feed/lib/feedNormalization.ts`
  - `normalizeDealerContentToCards`
  - `normalizeFeedServiceToCards`
  - `ensureAdTriviaPresence`
  - `logFeedParity`

## Integration

- `index.tsx` now imports feed config/constants/services/lib/types from `src/features/feed/*`.
- Removed in-file Feed duplicates to make `src/features/feed` the source of truth.
- Kept shared async sequencing helper (`shouldApplyLatestRequest`) in `index.tsx` because it is used by multiple non-Feed flows.

## Validation

- `npm run check:no-regression` passes (`lint`, `build`, `guardrails:phase1`).

## Next (Chat 4)

- Extract Scout + Plate slice primitives from `index.tsx` into `src/features/scout` and `src/features/plate`.
- Continue additive migration with behavior parity checks after each batch.
