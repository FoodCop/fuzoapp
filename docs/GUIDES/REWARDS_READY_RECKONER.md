# Developer Guide: Rewards Feature Ready Reckoner

This guide serves as a technical reference for the **FUZO Rewards** — the culinary point redemption interface.

---

## 🏗️ Technical Root
The feature is modularized within `src/features/rewards/`.

- **Main Entry Point**: `src/features/rewards/components/RewardsView.tsx`
- **Feature Export**: `src/features/rewards/index.ts`
- **Related Service**: `src/features/points/services/pointsService.ts`

---

## 🧭 Visual System

Rewards are categorized by logic-based color tokens mapping to high-affinity culinary categories:

| Category          | Vibe/Color | Icon       | Cost (Pts) |
|:------------------|:-----------|:-----------|:-----------|
| **Social Proof**  | Yellow     | Star       | 5,000      |
| **AI Creative**   | Indigo     | Sparkles   | 12,000     |
| **Expert Access** | Emerald    | Bot        | 25,000     |
| **Discovery**     | Blue       | MapPin     | 40,000     |

---

## 🏗️ State Handling
Currently, the `RewardsView` is a high-fidelity presentation layer. Integration with the points redemption backend occurs via the `PointsService`.

### Current Tiering:
- **Badge Redemption**: Profile customization.
- **Pack Redemption**: Neural filter injection into Snap Studio.
- **Expert Redemption**: Scheduling via Chat AI.

---

## 📡 Dependencies
- **Lucide React**: `Gift`, `Star`, `Sparkles`, `Bot`, `MapPin`.
- **Shared Types**: `IconComponent` for generic icon mapping.

---

## 🛠️ Modification Guide

### Adding New Rewards
Append items to the `rewards` array in `RewardsView.tsx`. The system uses `satisfies` to ensure type safety for icons and color tokens.

### Adjusting Color Palettes
Modify the `REWARD_COLOR_CLASSES` object to change the visual identity of reward tiers.

---

> [!TIP]
> **Aesthetics**: The header uses a `-rotate-3` transformation on the icon badge to give it a modern, playful "AAA" app feel.
