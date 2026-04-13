# Developer Guide: Bites Studio Ready Reckoner

This guide serves as a technical reference for the **Bites Studio** — an AI-powered culinary companion used to generate high-fidelity recipe cards from images or text descriptions.

---

## 🏗️ Technical Root
The feature is modularized within `src/features/bites/`.

- **Main Entry Point**: `src/features/bites/components/BitesView.tsx`
- **Studio Component**: `AIRecipeStudio`
- **Feature Export**: `src/features/bites/index.ts`
- **Shared Helpers**: `src/shared/lib/studioHelpers.ts`
- **Taxonomy**: `src/shared/utils/taxonomy.ts` (Cuisine/Category/Diet rules)

---

## 🧭 Multi-Step Studio Architecture

The Bites Studio uses a 4-step wizard orchestrated by `AIRecipeStudio`:

| Step | Name         | Component Logic                                      |
|:----:|:-------------|:-----------------------------------------------------|
|  0   | **Visuals**  | Image upload handler (Drag & Drop or File Picker)    |
|  1   | **Context**  | Multi-line text input for culinary description       |
|  2   | **Assembly** | **Gemini 2.5 Flash** neural generation & parsing     |
|  3   | **Success**  | Post-generation actions (Save, Share, Post to Feed) |

---

## 🧠 Neural Generation Pipeline

Bites Studio leverages **Gemini 2.5 Flash** for structured data extraction.

### Prompt Strategy
- Takes `description` + optional `image` (base64 inline data).
- Enforces strict JSON schema via `responseSchema` configuration.
- Categories are strictly mapped to `UGC_CUISINES`, `BITES_AI_TAG_OPTIONS`, and `UGC_DIETS`.

### Extraction Fields
- `title`: Creative recipe name.
- `category`: Geographic/Culinary origin (e.g., Italian, Fusion).
- `readyInMinutes`: Preparation + Cook time estimate.
- `servings`: Intended portion count.
- `ingredients`: Array of normalized ingredient strings.
- `instructions`: Step-by-step assembly guide.
- `nutrition`: Object containing calories, protein, fat, and carbs.
- `aiTag`: High-level classification (e.g., "Recipe Card", "Food Hack").

---

## 💾 Action Workflow

When a recipe is "Lock in" (`handleFinish`), the following can occur:

1. **Save to Plate**: Calls `onSave` (passed from `index.tsx`) to persist in `public.saved_items`.
2. **Share**: Calls `onShareRequest` to open the `ShareModal`.
3. **Syndicate**: Calls `FeedService.publishToFeed` to post the AI card to the global discovery feed.

---

## 📡 Dependencies

- **Gemini SDK**: Handles multi-modal (Image + Text) analysis.
- **Lucide React**: UI Iconography.
- **Studio Helpers**: `readImageFileAsDataUrl` and `parseAiJson` for robust handling.

---

## 🛠️ Modification Guide

### Adding a New Cuisine Category
Update `UGC_CUISINES` in `src/shared/utils/taxonomy.ts`. The AI prompt dynamically pulls from this array.

### Adjusting Nutrition Logic
The `nutrition` schema is rigid in the Gemini config (L895-L921 in `BitesView.tsx`). To add fields (e.g., Sodium), update the schema and the `GeneratedRecipeCard` type.

### Changing Default Fallbacks
Edit `handleFinish` to adjust the fallback image URL used if no image was uploaded.

---

> [!TIP]
> **Performance**: The Studio automatically advances from Step 0 to Step 1 upon a successful image load to minimize user friction.
