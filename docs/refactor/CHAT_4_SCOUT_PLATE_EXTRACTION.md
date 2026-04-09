# Chat 4 — Scout + Plate Primitive Extraction

## Scope Completed

Extracted low-risk Scout and Plate helpers/constants from `index.tsx` into feature modules without behavior changes.

## Files Added

- `src/features/scout/lib/scoutUtils.ts`
  - `buildPhotoUrl`
  - `deriveCategory`
  - `mapWeekdayTextToTimings`

- `src/features/plate/constants/fallbackSavedItems.ts`
  - `FALLBACK_SAVED_ITEMS`

- `src/features/plate/lib/savedItems.ts`
  - `inferItemTypeFromId`
  - `normalizeSavedItemForUI`
  - `normalizeItemForPlateSave`

## Integration

- `index.tsx` now imports Scout and Plate helpers from feature modules.
- Removed duplicated in-file helper definitions for:
  - saved item id/category/type inference + normalization
  - scout photo/category/timings utility helpers
- `App` now uses `FALLBACK_SAVED_ITEMS` constant from feature module.

## Validation

- `npm run check:no-regression` passes (`lint`, `build`, `guardrails:phase1`).

## Next (Chat 5)

- Extract remaining feature slice primitives (Bites/Snap/Chat/Trims/Auth) from `index.tsx`.
- Continue incremental migration with no behavior changes.
