# Chat 7 — Chunking Boundaries + Conventions Finalization

## Scope Completed

Implemented stable chunking boundaries at build-time and finalized refactor conventions.

## Build Changes

Updated `vite.config.ts` with deterministic `manualChunks` grouping:

- `vendor-react`
- `vendor-icons`
- `vendor-supabase`
- `vendor-maps`
- `vendor-ai`
- `vendor-core`

This preserves runtime behavior while creating chunking boundaries for future modularization.

## Docs Finalized

- Added `docs/refactor/REFRACTOR_CONVENTIONS.md`
  - extraction rules
  - folder ownership
  - async-effect safety
  - chunking/lazy strategy
  - per-batch validation checklist

## Validation

- `npm run check:no-regression` passes (`lint`, `build`, `guardrails:phase1`).

## Note on Lazy Loading

View-level lazy loading is intentionally deferred until views are physically separated from `index.tsx` into module files. This avoids behavioral drift during Phase 1 safety-first refactoring.
