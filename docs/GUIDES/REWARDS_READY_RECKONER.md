# Developer Guide: Rewards & Gamification Ready Reckoner

This guide serves as a technical reference for the **FUZO Gamification & Rewards Engine** — the universal XP, leveling, and milestone progression system.

---

## 🏗️ Technical Root
The feature is modularized within `src/features/rewards/`.

- **Main UI Dashboard**: `src/features/rewards/components/RewardsView.tsx`
- **Data Types**: `src/features/rewards/types/gamification.ts`
- **Rules & Constants**: `src/features/rewards/constants/gamificationData.ts`
- **Logic Engine**: `src/features/rewards/utils/progressionEngine.ts`

---

## 🧭 System Architecture

The Gamification Engine tracks user progression across all features in FUZO. It evaluates a single JSONB column (`gamification_metadata` in `public.users`) and dynamically calculates progression.

### Core Concepts:
1. **XP & Levels (Taste Score)**: Global points earned for taking actions (visiting places, writing reviews).
2. **Roles**: Paths users can progress down (e.g., Food Explorer, Food Reviewer, Blogger, Recipe Creator).
3. **Badges**: Tiered rewards within a Role that unlock sequentially based on specific granular requirements.
4. **Achievements**: Standalone milestones not tied to a specific Role (e.g., "Coffee Lover" for visiting 10 cafes).

---

## 💾 Data Persistence (The State Layer)

All gamification stats are persisted in the `public.users` table under `gamification_metadata` (Type: `Json | null`).

The schema exactly matches the `GamificationState` interface:
```typescript
interface GamificationState {
  xp: number; // The global Taste Score (XP)
  stats: Record<string, number | boolean>; // Granular tracking (e.g. { restaurantsVisited: 5, cafesVisited: 12 })
  activeRole: string; // The role the user is currently viewing in their UI tracker
  earnedBefore: Record<string, boolean>; // Dictionary of already unlocked badges to prevent duplicate notifications
}
```

---

## 🛠️ Modification Guide

### 1. Adding a new XP Action
To award XP for a new feature (like "Share a link"), append a new object to the `XP_ACTIONS` array in `gamificationData.ts`. Ensure the `effect` property properly increments the specific stat counter (e.g., `linksShared: 1`).

### 2. Creating a new Badge or Role
Add it to the `ROLES` array in `gamificationData.ts`. Define the `reqs` (requirements) by targeting exact string keys that map to the `stats` object in the user's metadata. The engine automatically recalculates progress dynamically.

### 3. Adding an Achievement
Append to the `ACHIEVEMENTS` array. 

---

## 🧪 Testing & Demo Mode
The `RewardsView` currently contains a standalone **Demo Simulator** at the bottom of the page. This simulator mounts local state buttons to let developers manually trigger XP actions, other actions, and judgment flags to test the UI progression tracks, SVG rings, and unlock notifications without needing to hook up real database triggers.
