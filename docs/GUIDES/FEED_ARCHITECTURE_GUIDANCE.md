# Developer Guide: Feed & Discovery Architecture

This guide details the architecture, data flow, and interaction mechanisms for the **FUZO Feed** (Discovery) feature. 

---

## 🏗️ Technical Root
The Feed feature is modularized within `src/features/feed/`. It maintains a clear separation between data serving, normalization, and UI presentation.

- **Primary Container**: `src/features/feed/components/FeedView.tsx`
- **Logic Provider**: `src/features/feed/services/feedService.ts`
- **Logic Provider**: `src/services/plateService.ts` (Saving content)
- **Infrastructure**: `src/services/idempotencyService.ts` (Transaction safety)

---

## 📡 Data Serving Mechanism
The feed uses a **Dynamic Profile Injection** strategy to attribute content to real users.

### 1. Fetch Lifecycle
On component mount, `FeedView` executes `fetchFromFeedService()`:
1.  **Supabase Query**: `FeedService.generateFeed` performs a complex select on `public.fuzo_feed`.
2.  **Relational Join**: The query joins with `public.users` (aliased as `author`) to retrieve `display_name`, `username`, and `avatar_url`.
3.  **Security**: Uses a `requestSeqRef` to prevents race conditions during rapid batch dealing.

### 2. Fallback System
If the Supabase service is disabled or fails, the system falls back to `src/features/feed/constants/curatedFeed.ts`, ensuring a consistent "Toronto Explorer" local experience.

---

## 💾 Persistence & Idempotency
Saving items to a user's "Plate" is a multi-step process protected by an idempotency layer.

### 1. Idempotency Flow
When a user clicks **Save** (`DealCard` or `SwipeCard`):
1.  **Key Generation**: An operation key is generated based on the `itemId` and `itemType`.
2.  **Cache Check**: `IdempotencyService` checks the `idempotency_keys` table for an existing result for the current user.
3.  **Execution**: If no cache exists, `PlateService.saveToPlate` is executed, upserting the record into `saved_items`.
4.  **Storage**: The final result is stored in `idempotency_keys` with a 24-hour TTL.

### 2. RLS & Security
- **`idempotency_keys`**: Isolated by `auth.uid() = user_id`. Users can only manage their own operation keys.
- **`saved_items`**: Protected by RLS, ensuring users can only view, update, or delete their own saved content.

---

## 🗄️ Database Table: `public.fuzo_feed`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `type` | Text | `snap`, `trim`, `recipe`, `ad`, `trivia` |
| `user_id` | UUID | Foreign Key to `public.users(id)` (required for Profile Join) |
| `metadata` | JSONB | Core Payload (name, img, cat, address, etc.) |

---

## 🥨 Normalization & Adaptation
Because content can come from multiple sources (Supabase, Curated Fallbacks), we use a normalization layer to ensure the UI components receive a predictable `FeedUiItem` shape.

### Location: `src/features/feed/lib/feedNormalization.ts`
- **Metadata Preservation**: The normalization layer spreads 100% of the raw database record into the `metadata` object. This ensures that deep data (like recipe instructions or nutrition) is available for the detail modal without secondary network requests.

---

## 🎮 Interaction Modes

### 1. Mobile: "Discovery Feed"
Uses an interactive swipe engine (`SwipeCard.tsx`) with 4-way gesture support.
- **Tap**: Opens the **Deep Detail** modal for full post content.
- **Up (Share)**: Opens the share modal.
- **Down (Save)**: Persists item via `PlateService`.

### 2. Desktop: "Discovery Hand"
Uses a high-fidelity Batch Delivery model (`DealCard.tsx`) with a 3D flip mechanism.
- **1st Click**: Performs a 3D flip to reveal the card summary.
- **2nd Click (Back-face)**: Opens the **Deep Detail** modal.
- **Refined UI**: Removed headers and progress dots to focus entirely on card visual content.

### 3. Deep Detail Modal
Reuses the `SavedItemDetailModal` to provide a consistent, information-rich view:
- **Recipe View**: Full ingredients and step-by-step instructions.
- **Trim View**: Integrated video player and post summary.
- **Nutrition Panel**: Displays available caloric and macros data from metadata.

---

## 🛠️ Maintenance Checklist
1.  **Toggling the Service**: Set `VITE_USE_FEED_SERVICE=true` in `.env`.
2.  **Debugging Author Data**: Ensure every `fuzo_feed` record has a valid `user_id` pointing to an existing record in `public.users`.
3.  **Clearing Cache**: If save operations are stuck, clear the `idempotency_keys` table in Supabase.

---

> [!IMPORTANT]
> **Relational Integrity**: If the frontend returns `PGRST200` errors, verify that the Foreign Key relationship between `fuzo_feed` and `public.users` exists in the database schema.
