# Developer Guide: Trims Studio Ready Reckoner

This guide serves as a technical reference for the **Trims Studio** — an AI-powered engine for generating vertical "Trim Cards" from video uploads or YouTube URLs.

---

## 🏗️ Technical Root
The feature is modularized within `src/features/trims/`.

- **Main Entry Point**: `src/features/trims/components/TrimsView.tsx`
- **Studio Component**: `AITrimStudio`
- **Feature Export**: `src/features/trims/index.ts`
- **Search Logic**: `src/features/trims/lib/buildTrimQueries.ts`
- **Taxonomy**: `src/shared/utils/taxonomy.ts` (Vibe/Cuisine tags)

---

## 🧭 Multi-Source Studio Architecture

The Trims Studio supports two distinct entry pipelines:

| Pipeline | Source Type       | Logic                                                |
|:---------|:------------------|:-----------------------------------------------------|
| **Local** | Vertical Video    | Direct upload and base64 parsing for Gemini analysis |
| **Neural**| YouTube URL       | URL normalization and metadata extraction via Gemini |

### Wizard Steps

The Trims Studio uses a standardized **6-step wizard** orchestrated by `AITrimStudio`:

| Step | Name         | Component Logic                                      |
|:----:|:-------------|:-----------------------------------------------------|
|  0   | **Media**    | `TrimsMediaStep`: Video upload or YouTube URL input |
|  1   | **Identity** | `TrimsIdentityStep`: Title and category mapping      |
|  2   | **Story**    | `TrimsStoryStep`: AI-guiding description             |
|  3   | **Reveal**   | `NeuralReveal`: Immersive AI synthesis animation    |
|  4   | **Review**   | `TrimsReviewStep`: Trim Card preview & confirmation |
|  5   | **Success**  | Final CTAs & feed syndication                        |

---

## 🧠 AI Assembly Pipeline

The `requestGeneratedTrimCard` utility (internal to `TrimsView.tsx`) orchestrates the AI call.

### Multi-Modal Inputs
- **YouTube**: Sends the URL as context for Gemini to "watch" and summarize.
- **Upload**: Sends binary video data (base64) for direct frame/context analysis.

### System Instructions
The AI is instructed to act as a "Social Media Video Strategist" extracting:
- `title`: High-impact, vertical-friendly title.
- `caption`: Engaging summary text.
- `author`: Original creator or "FUZO AI Studio".
- `nutrition`: High-level nutritional highlights from the video content.
- `thumbnailUrl`: Extracted frame or representational image.

---

## 💾 Action Workflow

When a trim is saved (`handleFinish`):

1. **Plate Integration**: Calls `onSave` (passed from orchestrator).
2. **Feed Syndication**: Calls `FeedService.publishToFeed` with type `'video'`.
3. **Drafting**: Uses `trimDraftIdRef` to manage state across generation attempts.

---

## 📡 Dependencies

- **YouTube Service**: Normalizes URLs and fetches public metadata.
- **Gemini Service**: Executes the 2.5 Flash model for deep content analysis.
- **Studio Helpers**: Reuses shared UI logic from `src/shared/lib/studioHelpers.ts`.

---

## 🛠️ Modification Guide

### Adjusting the YouTube Regex
The `isYouTubeUrl` helper in `TrimsView.tsx` (L36) handles domain validation.

### Changing the AI Persona
Modify the system instruction string inside `requestGeneratedTrimCard` (starting L181).

### Updating Taxonomy
Trims uses `UGC_VIBES` for stylistic tagging. Update these in `src/shared/utils/taxonomy.ts` to see changes reflected in the AI output.

---

> [!IMPORTANT]
> **Video Requirements**: The studio is optimized for vertical (9:16) aspect ratios. Uploading horizontal video will result in a centered crop preview but won't block generation.
