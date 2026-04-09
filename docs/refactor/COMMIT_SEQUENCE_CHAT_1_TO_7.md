# Commit Sequence — Chats 1 to 7

Use this order to preserve narrative and minimize review noise.

## 0) Preflight

```bash
git status -sb
npm run check:no-regression
```

## 1) Chat 1 — Architecture map + skeleton

```bash
git add docs/refactor/CHAT_1_ARCHITECTURE_MAP.md
git add src/app src/entities src/features src/shared
git commit -m "refactor(chat-1): add architecture map and feature-sliced folder skeleton"
```

## 2) Chat 2 — Shared extraction

```bash
git add src/shared/constants/apiKeys.ts
git add src/shared/lib/feedDealer.ts src/shared/lib/resolvePublicAssetPath.ts
git add src/shared/types/feed.ts
git add index.tsx
git add docs/refactor/CHAT_2_SHARED_EXTRACTION.md
git commit -m "refactor(chat-2): extract shared types/constants/pure utils from index"
```

## 3) Chat 3 — Feed slice primitives

```bash
git add src/features/feed/constants src/features/feed/lib src/features/feed/services src/features/feed/types
git add index.tsx
git add docs/refactor/CHAT_3_FEED_SLICE_EXTRACTION.md
git commit -m "refactor(chat-3): extract feed slice primitives and adapters"
```

## 4) Chat 4 — Scout + Plate primitives

```bash
git add src/features/scout/lib/scoutUtils.ts
git add src/features/plate/constants/fallbackSavedItems.ts src/features/plate/lib/savedItems.ts
git add index.tsx
git add docs/refactor/CHAT_4_SCOUT_PLATE_EXTRACTION.md
git commit -m "refactor(chat-4): extract scout and plate helper primitives"
```

## 5) Chat 5 — Remaining slice primitives

```bash
git add src/features/bites/constants src/features/bites/lib src/features/bites/types
git add src/features/snap/services/snapPersistence.ts
git add src/features/chat/constants/chatSeeds.ts
git add src/features/trims/constants/fallbackVideos.ts
git add src/features/auth/constants/onboardingData.ts
git add index.tsx
git add docs/refactor/CHAT_5_REMAINING_SLICES_EXTRACTION.md
git commit -m "refactor(chat-5): extract bites/snap/chat/trims/auth primitives"
```

## 6) Chat 6 — App shell boundaries

```bash
git add src/app/bootstrap/mountApp.tsx
git add src/app/layout/navItems.ts
git add src/app/routes/renderAppView.tsx
git add src/app/hooks/useAuthSessionSync.ts src/app/hooks/useSavedItemsOnAuth.ts src/app/hooks/useTabUrlSync.ts
git add index.tsx
git add docs/refactor/CHAT_6_APP_SHELL_BOUNDARIES.md
git commit -m "refactor(chat-6): extract app shell routes/layout and app-level effects"
```

## 7) Chat 7 — Chunking + conventions

```bash
git add vite.config.ts
git add docs/refactor/REFRACTOR_CONVENTIONS.md docs/refactor/CHAT_7_CHUNKING_AND_CONVENTIONS.md
git commit -m "build(chat-7): add deterministic vendor chunking and refactor conventions"
```

## 8) Final verification

```bash
npm run check:no-regression
git status -sb
```

## If index.tsx changes span multiple chats

`index.tsx` currently includes edits from multiple chat milestones. If you need perfectly separated commits per chat, use interactive staging:

```bash
git add -p index.tsx
```

Stage only the hunks that belong to the target chat before each commit.
