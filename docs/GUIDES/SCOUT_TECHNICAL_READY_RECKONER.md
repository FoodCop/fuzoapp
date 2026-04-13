# Developer Guide: Scout Technical Ready Reckoner

This guide serves as a comprehensive technical reference for the **Scout Map Discovery** feature. It details the architecture, service integrations, and persistence mechanisms.

---

## 🏗️ Technical Root
The feature is fully modularized within `src/features/scout/`.

- **Main Entry Point**: `src/features/scout/components/ScoutView.tsx`
- **Data Entry**: `src/features/scout/index.ts` (Feature Export)
- **Logic Hub**: `src/features/scout/lib/scoutLogic.ts`
- **Persistence**: `src/features/scout/services/scoutPersistence.ts`

---

## 📡 The Hybrid Data Discovery Model
Scout utilizes a hybrid approach for data retrieval, bridging **Google Places** and **Supabase**.

### 1. Google Places Proxy (External)
To protect API keys and handle complex queries, Scout uses the `PlacesService.ts` which communicates with a **Supabase Edge Function** (`make-server-5976446e`).
- **Nearby Search**: Fetches restaurants within a set radius (default 5km).
- **Details Fetching**: Retrieves deep metadata (hours, reviews, photos) only when a place is selected.
- **Search Along Route**: Uses a custom algorithm to find spots along a polyline.

### 2. FUZO Dataset (Internal)
The `fuzo` tab displays curated locations from `public.fuzo_locations`. This dataset is community-driven and grows as users use the "Pin" feature.

---

## 💾 Contribution & Persistence Logic
User discovery is anchored by the **Idempotent Playbook**. 

### 1. The "Pin to Map" Workflow
When a user clicks on the map to "discover" a new spot:
1.  **Reverse Geocoding**: The `google.maps.Geocoder` resolves the Lat/Lng to an address.
2.  **Creation UI**: `ScoutPlaceModal` transitions into "New Find" mode.
3.  **The idempotent Save**: `ScoutPersistence.saveScoutFind` executes a triple-write:
    - **`posts`**: Creates a new social post in the community feed.
    - **`fuzo_locations`**: Adds the spot to the global map dataset.
    - **`saved_items`**: Persists the spot to the user's personal "Plate" via `PlateService`.

### 2. Idempotency Layer
`PlateService.saveToPlate` utilizes `IdempotencyService` to ensure that even if a user clicks "Save" multiple times (or network jitter causes retries), only one record is created for that specific `(user_id, item_id, item_type)` tuple.

---

## 🗄️ Database Tables used by Scout

| Table | Description | Scout Role |
| :--- | :--- | :--- |
| `fuzo_locations` | Global set of pins | Driven by user contributions and admin seeding. |
| `posts` | Community Feed | A new post is generated whenever a "New find" is saved. |
| `saved_items` | User's Plate | Personal collection of restaurants (type: `restaurant`). |
| `idempotency_keys` | Transaction Safety | Guards save/unsave operations from duplicate triggers. |

---

## 🎮 Intelligence: The Neural Match
Scout simulates an AI recommendation engine using `calculateNeuralMatch` in `scoutLogic.ts`.
- **Current Logic**: A weighted score based on the `rating` (rating * 20) with a ±5% random jitter to feel "alive".
- **Future Hook**: This should be replaced with a real vector-search result comparing the user's `culinary_onboarding` metadata against the place's `vibe` tags.

---

## 🛠️ Modification Processes

### Adding New Filters
To add a filter (e.g., "Budget"):
1.  Update `ScoutFilter` type in `types/scoutUi.ts`.
2.  Add the button to `ScoutDiscoveryPanel.tsx`.
3.  Implement the filtering logic in `lib/scoutLogic.ts` -> `filterPlaces`.

### Adjusting the Map Loader
Currently, the map is loaded in `index.tsx` as a shared resource. To modify the libraries or version, update the `Loader` configuration in the `initGlobalMaps` hook in `index.tsx`.

---

> [!IMPORTANT]
> **Edge Function Dependency**: If `Search Along Route` fails, ensure the Supabase project has the `make-server-5976446e` function deployed and that the `VITE_SUPABASE_ANON_KEY` has correct permissions.
