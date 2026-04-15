# Developer Guide: Scout Technical Ready Reckoner

This guide serves as a comprehensive technical reference for the **Scout Map Discovery** feature. It details the architecture, service integrations, and persistence mechanisms of the premium full-bleed map experience.

---

## 🏗️ Technical Root
The feature is fully modularized within `src/features/scout/`.

- **Main Entry Point**: `src/features/scout/components/ScoutView.tsx`
- **Data Entry**: `src/features/scout/index.ts` (Feature Export)
- **Logic Hub**: `src/features/scout/lib/scoutLogic.ts`
- **Persistence**: `src/features/scout/services/scoutPersistence.ts`
- **Manual Pinning**: `src/features/scout/components/ScoutAddPinModal.tsx`

---

## 🗺️ Layout & Architecture: Full-Bleed Map
Scout has evolved from a tabbed interface to a **Google Maps-style immersive layout**.

### 1. Viewport Breakout
Scout is the only view that breaks the standard content container. 
- **Implementation**: The parent `index.tsx` detects the active `scout` tab and strips the `<main>` container's padding and max-width.
- **Result**: The map fills 100% of the viewport width and height.

### 2. UI Components (Floating Layer)
- **Floating Search Bar**: Top-left positioned with integrated Legend Pill.
- **Map Control Cluster**: Top-right floating buttons for Refresh, Route Planning, My Location, and the `+` Add Pin trigger.
- **Discovery Panel**: 
  - **Mobile**: A responsive bottom sheet with "Peek" (140px) and "Expanded" (65vh) states.
  - **Desktop**: A glassmorphism side panel (380px) overlaid on the map.

---

## 📡 The Unified Data Model
Scout no longer silos data by source. All sources are merged into a single `activePlaces` array and rendered simultaneously.

### 1. Color-Coded Markers
| Source | Color | Description |
| :--- | :--- | :--- |
| **Google Places** | 🔵 Blue | API-fetched nearby restaurants and search results. |
| **FUZO Community** | 🟡 Yellow | User-contributed pins from the `fuzo_locations` table. |
| **My Saved Items** | 🟢 Green | The user's personal "Plate" items with coordinates. |

### 2. Search Logic
- **Nearby (Default)**: Fetches spots near the map center.
- **Text Search**: Uses `PlacesService.searchByText` when a query is submitted via the Enter key or the Search icon.

---

## 💾 Manual Pinning (The "Fuzo Pin" Flow)
Users can manually contribute new locations using the **ScoutAddPinModal**.

### 1. The 6-Step Immersive Wizard
1. **Region Selection**: Input Country/State. Uses `google.maps.Geocoder` to auto-center the map.
2. **Interactive Pinpoint**: Draggable yellow marker for precise placement.
3. **Identity**: Name and Cuisine categorization using global taxonomy.
4. **Media**: Multi-photo uploader (up to 4 images).
5. **Insights**: 
    - **Review**: Star rating + text feedback.
    - **Opening Hours**: Custom editor for day-by-day business hours.
6. **Syndication**: Final save state.

### 2. Triple-Action Persistence
`ScoutPersistence.saveScoutFind` executes a combined transaction:
- **Feed Integration**: Creates a social post in the `posts` table with the discovery images.
- **Global Map**: Adds the entry to `fuzo_locations` with `timings` and `rating`.
- **Personal Plate**: Adds it to the user's private collection.

---

## 🗄️ Database Schema & Roles

| Table | Description | Scout Specific Columns |
| :--- | :--- | :--- |
| `fuzo_locations` | Global set of map pins | `timings` (jsonb), `rating` (numeric), `photos` (text[]), `notes` (text) |
| `posts` | Community Feed | `images` (jsonb), `latitude`, `longitude`, `rating` |
| `saved_items` | User's Plate | Metadata includes `source: 'scout_pin'` for filtering. |

---

## 🎮 Intelligence: Neural Matching
Scout visualizes match quality using `calculateNeuralMatch` in `scoutLogic.ts`.
- **Logic**: Weights the global `rating` and applies a random jitter to create a "live" discovery feel.
- **Metadata Bridge**: The "Add Pin" flow specifically tags discoveries to ensure they are indexed by the discovery algorithm.

---

## 🛠️ Developer Modifications

### Adding a New Map Utility
1. Update JSX in the map control cluster (lines ~540 in `ScoutView.tsx`).
2. Style to match the white circle, stone-600 icon pattern.

### Updating Taxonomy
Manual pinning uses `UGC_CUISINES` from `src/shared/utils/taxonomy.ts`. Ensure any new restaurant categories are added there.

---

> [!IMPORTANT]
> **Map Hierarchy**: The map instance is stored in `mapInstanceRef`. Always check for existence before calling map methods (e.g., `panTo` or `setZoom`).
