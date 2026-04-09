# Phase 1 — Baseline Freeze & Guardrails

## Goal

Lock a stable baseline before structural refactors so every future change can be validated quickly and safely.

## Baseline Reference

- Baseline commit (short): `52915ca0`
- Baseline commit (full): `52915ca0f44bc029493bf83773967a4a83b62ce7`
- Default branch: `main`
- Deploy target: Vercel from root build (`dist`)

## Phase 1 Deliverables

1. **Clean baseline state**
   - `git status -sb` must be clean before each refactor batch.

2. **Automated no-regression checks**
   - `npm run check:no-regression`
   - Includes:
     - Typecheck (`npm run lint`)
     - Production build (`npm run build`)
     - Deployment/config shape guardrails (`npm run guardrails:phase1`)

3. **Deployment invariants locked**
   - `vercel.json` must keep:
     - `buildCommand = npm run build`
     - `outputDirectory = dist`
     - rewrite `/(.*) -> /index.html`
   - `vite.config.ts` must keep base at root (`/`).

4. **Manual smoke checklist (minimum)**
   - Start app: `npm run dev`
   - Validate core flows:
     - Feed loads cards and retry path works
     - Scout loads discovery map/list path
     - Plate save flow and basic profile data path
     - Auth session restore/sign-out behavior

## Guardrail Commands

```bash
npm run check:no-regression
```

```bash
git status -sb
```

```bash
npm run dev
```

## Stop Conditions (do not proceed to next phase if any fail)

- `check:no-regression` fails
- Vercel deploy config drifts from baseline invariants
- Manual smoke check fails in Feed, Scout, or Plate core path

## 7-Chat Refactor Cadence (post-Phase 1)

Use one chat per bounded milestone to preserve context quality:

1. **Chat 1**: Architecture map + folder skeleton (no behavior changes)
2. **Chat 2**: Extract shared types/constants/pure utils
3. **Chat 3**: Feed slice extraction (highest churn)
4. **Chat 4**: Scout + Plate slice extraction
5. **Chat 5**: Remaining feature slices (Bites/Snap/Chat/Trims/Auth)
6. **Chat 6**: App shell + routing/layout boundaries + hooks/effects separation
7. **Chat 7**: Lazy loading/chunking + docs/conventions finalization

Each chat should end with:
- `npm run check:no-regression`
- brief manual smoke on affected features
- commit

## Notes

- This phase is intentionally conservative: no feature work, only safety rails and baseline locking.
- Keep changes incremental and easy to revert.
