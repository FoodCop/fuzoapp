# Developer Guide: Feed Ready Reckoner

The **Discovery Feed** is the primary entry point for high-fidelity culinary exploration, supporting multi-modal content types (Snap, Trim, Recipe, Ad, Trivia) and cross-platform interaction models.

---

## 🏗️ Technical Root
The feature is integrated within `src/features/feed/`.

- **Main Entry Point**: `src/features/feed/components/FeedView.tsx`
- **Logic Provider**: `src/features/feed/services/feedService.ts`
- **Normalization**: `src/features/feed/lib/feedNormalization.ts`
- **Idempotency**: `src/services/idempotencyService.ts`
- **Fallbacks**: `src/features/feed/constants/curatedFeed.ts`

---

## 📡 Data Serving & Discovery

### 1. Dynamic Profile Injection
The feed uses a **Relational Join** strategy to attribute content to the community.
- **Service**: `FeedService.generateFeed` performs a complex select on `public.fuzo_feed`.
- **Relational Tie**: Automatically joins with `public.users` (as `author`) to populate `display_name`, `username`, and `avatar_url`.
- **Security**: Orchestration via `requestSeqRef` prevents race conditions during paginated deal/swipe cycles.

### 2. Localization & Fallbacks
If the Supabase backend is unreachable or toggled off via `VITE_USE_FEED_SERVICE`, the system falls back to a high-fidelity local dataset (`curatedFeed.ts`) centered on the "Toronto Explorer" experience.

---

## 💾 Persistence & Idempotency
Saving items from the global feed to a user's private "Plate" is a protected transaction.

### 1. The Idempotency Layer
To prevent duplicate state writes and database bloat:
1.  **Keying**: An operation key is generated from the `itemId` and `itemType`.
2.  **Verification**: `IdempotencyService` checks the `idempotency_keys` table.
3.  **Execution**: `PlateService.saveToPlate` is only called if no valid key exists.
4.  **Retention**: Keys are cached for 24 hours.

### 2. Database Schema: `public.fuzo_feed`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary identifier. |
| `type` | Text | Classification (`snap`, `trim`, `recipe`, `ad`, `trivia`). |
| `user_id` | UUID | Foreign Key used for Profile Join. |
| `metadata` | JSONB | Complete structured payload (Instructions, Video IDs, Coordinates). |

---

## 🎮 Interaction Engines

### 1. Mobile (Discovery Hand)
Uses the `SwipeCard.tsx` engine with 4-way gesture intelligence:
- **Tap**: Deep detail modal pivot.
- **Up (Share)**: Opens the Hub share modal.
- **Down (Save)**: Triggers the idempotency-protected persistence flow.

### 2. Desktop (Spatial Deal)
Uses the `DealCard.tsx` model with a 3D-flip delivery mechanism:
- **Delivery**: Cards are "dealt" into a 3D stack.
- **Interaction**: First click flips to summary; second click opens the deep detail.

---

## 🛠️ Developer Modifications

### Adding a New Feed Type
1. Define the type in `fuzo_feed` table enum.
2. Update `FeedUiItem` type in `src/features/feed/types/index.ts`.
3. Add a specialized card renderer or detail view logic in `FeedView` or `SavedItemDetailModal`.

### Adjusting Geolocation Range
The feed range is determined by the `getUserFeedLocation` helper. Edit the default radius in `src/features/feed/services/feedService.ts`.

---

> [!IMPORTANT]
> **Relational Integrity**: Always ensure that every record in `fuzo_feed` has a valid `user_id` pointing to an existing record in the `users` table, otherwise the Relational Join will result in a UI failure.
