# Chat 1 — Architecture Map + Folder Skeleton (No Behavior Changes)

## Scope

This milestone creates project structure only.

- No feature behavior changes
- No routing changes
- No service contract changes
- No visual/UI changes

## Current Baseline (as-is)

- App entry and most feature logic are centralized in `index.tsx`
- Platform/API adapters currently live in `src/services/`
- Supabase edge functions live in `supabase/functions/`

## Target Refactor Boundaries

### App Shell

- `src/app/bootstrap` — startup wiring, root mount, boot sequence
- `src/app/providers` — cross-app providers (auth/session/query/theme)
- `src/app/routes` — route composition and screen-level boundaries
- `src/app/layout` — shell layout primitives (nav/frame/top-level containers)

### Feature Slices

- `src/features/feed` — card dealing, swipe/feed presentation, feed actions
- `src/features/scout` — map/list discovery workflows
- `src/features/plate` — save/plate interactions and plate detail path
- `src/features/bites` — bite-specific UI/logic
- `src/features/snap` — media/capture/share slice
- `src/features/chat` — messaging/chat UI and interactions
- `src/features/trims` — settings/profile/supporting trim surfaces
- `src/features/auth` — auth/session UI flows

### Shared + Domain

- `src/shared/components` — reusable UI primitives
- `src/shared/hooks` — reusable hooks
- `src/shared/lib` — pure utility helpers
- `src/shared/types` — cross-feature types
- `src/shared/constants` — cross-feature constants
- `src/entities/user` — user-domain entity models/helpers
- `src/entities/content` — content-domain entity models/helpers

## Migration Rules for Upcoming Chats

1. Extract one bounded area at a time; keep imports compatible.
2. Move pure types/constants/utils before moving component behavior.
3. Prefer adapter wrappers over direct service rewrites.
4. Maintain `npm run check:no-regression` green after each batch.
5. Validate affected flows manually (Feed/Scout/Plate/Auth minimum).

## Skeleton Created in This Chat

- `src/app/{bootstrap,layout,providers,routes}`
- `src/features/{feed,scout,plate,bites,snap,chat,trims,auth}` (+ `components`/`hooks` and key `services`/`types` where applicable)
- `src/shared/{components,hooks,lib,types,constants}`
- `src/entities/{user,content}`

> This structure is intentionally additive and safe: no runtime wiring changed yet.
