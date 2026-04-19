# FUZO V2 File Audit (2026-03-09)

This audit focuses on identifying non-runtime or low-value files before the next push.

## Summary

- Largest footprint is `public/` at ~568 MB.
- Most of `public/` size is in media-heavy folders likely used for content generation and experimentation.
- App/runtime code appears to rely primarily on API/Supabase services and not directly on most heavy local asset folders.

## Size Snapshot

Top folders:
- `public/` -> 568.46 MB (507 files)
- `scripts/` -> 0.14 MB (34 files)
- `supabase/` -> 0.08 MB (29 files)
- `src/` -> 0.08 MB (74 files)
- `docs/` -> 0.02 MB (11 files, already git-ignored)

`public/` subfolders:
- `public/generated-images/` -> 237.31 MB (207 files)
- `public/ads/` -> 138.05 MB (139 files)
- `public/trivia/` -> 92.87 MB (76 files)
- `public/images/` -> 83.81 MB (49 files)
- `public/banners/` -> 3.50 MB (9 files)
- `public/UPDATE/` -> 0.32 MB (11 files, already git-ignored)

## Observations

1. Runtime references to heavy asset groups are weak or absent.
- Search results showed no direct app code references to many paths in `public/images`, `public/ads`, `public/trivia`, and `public/banners`.
- `public/generated-images` appears strongly tied to generation scripts and metadata workflows, not clearly to active runtime rendering.

2. Script/tooling references exist for generation data.
- `scripts/*` references `public/generated-images/` and `public/generated-images/image-metadata.json`.
- `scripts/*` references `public/MasterSet_01.json` for generation/splitting flows.

3. Legacy/reference artifacts likely removable or archivable.
- `public/Search Results.html`
- `public/SUpabase Chat.txt`
- `public/images/new_banners.zip`
- Potentially many Firefly-named one-off images in `public/images/`

## Candidate Classification

### Keep (likely active)
- `src/**`, `index.tsx`, `server.ts`, `supabase/**`, `api/**`
- `public/favicon*`, `public/logo_*`, `public/marker.png`, other clearly branded essentials
- `public/MasterSet_01.json` (until generation pipeline is retired)
- `public/generated-images/image-metadata.json` (until generation pipeline is retired)

### Archive (likely useful historically, not runtime-critical)
- `public/generated-images/**` (bulk generated content)
- `public/ads/**`
- `public/trivia/**`
- `public/images/**` except explicitly referenced brand assets
- `public/banners/**`

### Delete First (low-risk)
- `public/Search Results.html`
- `public/SUpabase Chat.txt`
- `public/images/new_banners.zip`

## Safe Cleanup Plan (Phased)

Phase 1: Low-risk deletions
- Remove obvious non-runtime files listed in "Delete First".
- Run `npm run lint` and smoke test app.

Phase 2: Archive heavy media
- Move large media folders to an external archive location (outside repo) or a separate storage bucket.
- Keep only the minimum subset required by the app.

Phase 3: Generation pipeline split
- Move generation assets/scripts into a separate `content-pipeline` repo or archive branch.
- Keep production runtime repo focused on app + backend + migration code.

## Recommendation Before Next Push

- Execute only Phase 1 deletions now.
- Defer bulk media removal until we explicitly confirm any runtime paths that still depend on those assets.
