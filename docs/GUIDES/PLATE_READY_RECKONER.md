# Developer Guide: Plate (Profile) Ready Reckoner

The **Plate** (rendered via `ProfileView`) is the user's personal culinary studio — a centralized hub for managing saved recipes, snapped photos, vertical videos, and discovered locations.

---

## 🏗️ Technical Root
The feature is located within `src/features/profile/`.

- **Main Entry Point**: `src/features/profile/components/ProfileView.tsx`
- **Detail View**: `src/features/profile/components/SavedItemDetailModal.tsx`
- **Map Visualizer**: `src/features/profile/components/MiniMapWidget.tsx`
- **Points & Ranking**: `src/features/profile/components/LeaderboardModal.tsx`
- **Types**: `src/features/profile/types/profile.ts`

---

## 🧭 Information Architecture (The 6-Tab Studio)

The Plate organizes a unified `savedItems` array into specialized categories using a tabbed interface.

| Tab | Icon | Logic / Filtering |
| :--- | :--- | :--- |
| **Places** | `MapPin` | Default. Items without `recipe-`, `video-`, or `post-` prefixes. |
| **Food Map** | `Pin` | Visualizes all saved locations on a specialized `MiniMapWidget`. |
| **Recipes** | `ChefHat` | Items with the `recipe-` prefix (source: Bites Studio). |
| **Videos** | `PlayCircle` | Items with the `video-` prefix (source: Trims Studio). |
| **Crew** | `User` | Social connections and friends list. |
| **Posts** | `LayoutGrid` | Items with the `post-` prefix (source: Snap Studio). |

---

## 🧠 Data Orchestration

### 1. Profile Persistence
User profile metadata (Bio, Avatar, Cover, Ranking) is aggregated from multiple sources:
- **Auth Metadata**: Initial defaults from Supabase Auth (`authUser.user_metadata`).
- **Settings Service**: Overridden by persistent data in the `profiles` table.
- **Points Service**: Real-time rank calculation based on community contribution.

### 2. Item Filtering Logic
The Plate uses a deterministic prefix-parsing strategy in `filteredItems` to categorize the unified `AppItem` stream:
- `hasIdPrefix(i, 'recipe-')` → Recipes tab.
- `hasIdPrefix(i, 'video-')` → Videos tab.
- `hasIdPrefix(i, 'post-')` → Community posts.

---

## 💾 Action Workflow

When a user interacts with a saved item on their Plate:
1. **Selection**: `setSelectedSavedItem(item)` opens the `SavedItemDetailModal`.
2. **Unsave**: Passes the request back to the root `onUnsave` handler for database synchronization.
3. **Share**: Reuses the global `onShareRequest` flow to send items to the Crew (Chat).

---

## 🛠️ Developer Modifications

### Adding a New Saved Category
1. Add the new category prefix to the `TAB_IDS` in `navItems.ts` if applicable.
2. Update the `tabs` array in `ProfileView.tsx`.
3. Add a new filtering case to the `filteredItems` useMemo block.

### Updating Rank Logic
The rank display is triggered by clicking the "Rank" stat. Modification to the ranking algorithm should be handled in `src/features/points/services/pointsService.ts`.

---

> [!NOTE]
> **Map Hierarchy**: The `MiniMapWidget` is a read-only visual representation of the user's "Food Territory". Unlike the Scout map, it is optimized for high-density historical data visualization.
