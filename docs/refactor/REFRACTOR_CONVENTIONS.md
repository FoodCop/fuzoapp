# Refactor Conventions (Post-Phase 1)

## Core Rules

1. Keep behavior unchanged in each chat batch.
2. Move code by bounded slice (`src/features/*`, `src/app/*`, `src/shared/*`).
3. Prefer extracting pure types/constants/utils before stateful hooks/components.
4. Keep deployment invariants unchanged:
   - `vercel.json` build command/output/rewrite
   - `vite.config.ts` `base: '/'`
5. End every batch with `npm run check:no-regression`.

## Folder Ownership

- `src/app/*`:
  - bootstrap, route rendering orchestration, app-level hooks/effects, layout/nav metadata
- `src/features/*`:
  - feature-owned constants, services, hooks, components, view helpers
- `src/shared/*`:
  - cross-feature utilities, constants, reusable types, generic components/hooks
- `src/entities/*`:
  - domain models and domain-specific helper mappers

## Extraction Pattern

1. Create destination module in target slice.
2. Copy logic exactly, preserving call contracts.
3. Replace in-source implementation with imports.
4. Remove duplicate in-source code.
5. Run typecheck/build/guardrails.

## Async Effect Safety

- Preserve mounted/request-sequence guards when moving effect logic.
- Keep fallback behavior unchanged for all network calls.
- Keep user-facing error text stable unless explicitly changing UX.

## Chunking / Lazy Strategy

- Use deterministic Vite `manualChunks` for stable vendor boundaries.
- Add route/view-level lazy loading only after view components are physically split into modules.
- Do not hide warnings by increasing chunk warning limits during refactor.

## Validation Checklist Per Batch

- `git status -sb` inspected
- `npm run check:no-regression` passes
- Smoke test affected flows only (minimum impacted views)
- Update refactor chat note in `docs/refactor/CHAT_*.md`
