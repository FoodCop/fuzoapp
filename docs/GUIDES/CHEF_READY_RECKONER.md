# Developer Guide: Chef AI Ready Reckoner

This guide serves as a technical reference for the **Chef AI** — a dedicated conversational interface for culinary guidance.

---

## 🏗️ Technical Root
The feature is modularized within `src/features/chef/`.

- **Main Entry Point**: `src/features/chef/components/ChefAIView.tsx`
- **Constants**: `src/features/chef/constants/prompts.ts`
- **Feature Export**: `src/features/chef/index.ts`
- **External Service**: `src/services/geminiService.ts`

---

## 🧭 Intelligence Architecture

The Chef AI uses a direct-to-neural pipeline:

- **Model**: `gemini-3-flash-preview`.
- **System Instruction**: "You are Chef FUZO, an elite AAA culinary expert. Be bold, concise, and professional."
- **Interface**: Clean, message-based chat with typing support and auto-scroll.

---

## 💡 Suggested Prompts
The interface provides high-frequency entry points defined in `CHEF_SUGGESTED_PROMPTS`:
- "What can I cook with salmon?"
- "Quick 15-min breakfast ideas"
- "How to make perfect sushi rice?"
- "Protein-rich dinner for two"

These are also imported into the **Bites Studio** to maintain consistent suggestions.

---

## 📡 Dependencies
- **Lucide React**: `Bot`, `Send` icons.
- **Gemini Service**: Handles the asynchronous LLM requests with built-in error handling for "Studio signal weak" states.

---

## 🛠️ Modification Guide

### Changing the AI Personality
Update the `systemInstruction` in `ChefAIView.tsx` (found in the `sendMessage` function).

### Updating Prompts
Modify `src/features/chef/constants/prompts.ts`. Changes will propagate to both the Chef Chat and the Bites Studio.

---

> [!TIP]
> **Performance**: The view uses `useEffect` with `messages.length` dependency to ensure the chat always scrolls to the latest Chef response.
