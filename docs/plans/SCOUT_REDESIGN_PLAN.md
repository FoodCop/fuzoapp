# Scout Redesign — Google Maps-Style Full Bleed Map

**Date**: 2026-04-15  
**Status**: In Progress

---

## Goal

Redesign the Scout feature from its current tabbed, split-panel layout into a **Google Maps-style full-bleed map experience**. All three data sources (Google Places, FUZO community snaps, My Map saved items) will be unified onto a single map with differentiated markers. No tabs.

---

## Current Architecture (Problems)

1. **Not full-bleed**: Map constrained within `h-[60vh]` on mobile, `lg:grid-cols-3` split on desktop, with rounded corners, thick borders, and parent `<main>` padding (`px-6 md:px-12 max-w-6xl`)
2. **Three separate tabs** (`Main`, `FUZO`, `My Map`) — user can only see one data source at a time
3. **Discovery sidebar** takes 1/3 of desktop width, reducing map space
4. **Parent layout constraint**: `<main>` wraps all views with fixed padding — prevents edge-to-edge

---

## New Layout

### Mobile
```
┌─────────────────────────────────────┐
│ MAP (full viewport, edge-to-edge)   │
│                                     │
│ ┌────────────────┐       ┌───┐      │
│ │ 🔍 Search Bar  │       │ ⟳ │      │
│ └────────────────┘       │ ▶ │      │
│ ┌────────────────┐       │ ⊕ │      │
│ │ Legend Pill     │       └───┘      │
│ └────────────────┘                  │
│                                     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ─── (drag handle)          │    │
│  │ Bottom Sheet (place list)   │    │
│  │ Peek: ~140px, Expand: 60vh │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│ Bottom Nav Bar                      │
└─────────────────────────────────────┘
```

### Desktop
```
┌──────┬──────────────────────────────────────────┐
│      │ MAP (full remaining width, edge-to-edge) │
│      │                                          │
│ Side │ ┌──────────────┐            ┌─────┐      │
│ bar  │ │ 🔍 Search    │            │ ⟳   │      │
│      │ └──────────────┘            │ ▶   │      │
│ Nav  │ ┌──────────────┐            │ ⊕   │      │
│      │ │ Legend Pill   │            └─────┘      │
│      │ └──────────────┘                          │
│      │ ┌──────────────┐                          │
│      │ │  Floating     │                          │
│      │ │  Discovery    │                          │
│      │ │  Panel        │                          │
│      │ │  (380px)      │                          │
│      │ │  glassmorphism│                          │
│      │ └──────────────┘                          │
└──────┴──────────────────────────────────────────┘
```

---

## Marker Color Coding

| Source | Color | Marker |
|--------|-------|--------|
| Google Places | 🔵 Blue (`#3b82f6`) | API-fetched restaurants |
| FUZO Community | 🟡 Yellow (`#facc15`) | Community snaps from `fuzo_locations` table |
| My Saved Items | 🟢 Green (`#10b981`) | User's saved plate items with lat/lng |

All three appear **simultaneously** on a single map. No tabs to switch between them.

---

## Files Modified

### 1. `index.tsx` — Parent Layout Override
- Add `isFullBleedView` flag when `tab === 'scout'`
- Conditionally strip `<main>` padding, max-width, top padding
- Conditionally hide mobile header (hamburger + bell)

### 2. `src/features/scout/components/ScoutView.tsx` — Main Rewrite
- **Remove** all tab state (`scoutTab`) and tab UI
- **Merge** all three data sources into unified `activePlaces`
- **Full-bleed** map container (`absolute inset-0`)
- **Color-coded markers** by `markerSource`
- **Legend pill** below search bar
- **Map controls** floating right (refresh, route, my-location)
- **Bottom sheet** on mobile, **floating panel** on desktop

### 3. `src/features/scout/components/ScoutDiscoveryPanel.tsx` — Restyle
- **Mobile**: Bottom sheet with drag handle, peek (140px) → expand (60vh)
- **Desktop**: Floating glassmorphism panel, `absolute` positioned over map
- Add source badge (color dot) to each place card

### 4. `src/features/scout/components/ScoutRoutePlanner.tsx` — Minor
- Adjust z-index layering for new layout
- No functional changes

### 5. `src/features/scout/types/scoutUi.ts` — Cleanup
- Remove `ScoutMapTab` type (tabs are gone)

---

## Data Flow (Before vs After)

### Before
```
scoutTab === 'main'  →  activePlaces = mainMapPlaces
scoutTab === 'fuzo'  →  activePlaces = communitySnapPlaces
scoutTab === 'my'    →  activePlaces = myMapPlaces
```

### After
```
activePlaces = deduplicate([
  ...mainMapPlaces,        // markerSource: 'google'
  ...communitySnapPlaces,  // markerSource: 'fuzo'
  ...myMapPlaces           // markerSource: 'saved'
])
```

---

## Preserved Functionality

- ✅ Marker clustering via `@googlemaps/markerclusterer`
- ✅ Place detail modal (`ScoutPlaceModal`)
- ✅ Route planner with along-route search
- ✅ Snap Studio bridge (contribute from discovered places)
- ✅ Reverse geocode on map click (pin new discoveries)
- ✅ FUZO community data from Supabase
- ✅ Auto-geolocation on mount
- ✅ Search bar with query state
- ✅ Filter pills (All, Top Rated, Open Now, Distance)
