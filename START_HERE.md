# 🚀 START HERE: Welcome to FUZO V2

Welcome to the FUZO V2 Core App repository! 

This document is designed to give you (and your AI Agent) an immediate, high-level understanding of the project's architecture, recent structural changes, and the exact steps to get started.

---

## 🤖 Prompt for the AI Agent
*If you are an AI agent reading this, please acknowledge this document and execute the following steps to build your context:*
1. Read `README.md` at the root for environment variables and build scripts.
2. Read `docs/STATUS_REPORT.md` and `docs/NEXT_STEPS.md` to understand the most recently completed features and current handover status.
3. Read `docs/SKILLS.md` to understand the operational skills and debugging logic specific to this repo.
4. Note that we have completely **decoupled from the Spoonacular API** and now use a highly-optimized offline database (`src/services/curatedRecipes.json`). **Do not attempt to use Spoonacular API keys.**

---

## 🏗️ High-Level Architecture

FUZO V2 is a React-based Single Page Application (SPA) built with Vite, TypeScript, and Supabase. 

### 1. The Subdomain Split (Important Context)
The project is strictly separated into two domains:
- **`fuzo.app`**: The cinematic landing page (hosted in a separate repo).
- **`app.fuzo.app`**: This repository. It contains the **core app** and boots directly into the Auth/Feed flow. There is no landing page code here.

### 2. Tech Stack
- **Frontend Framework**: React 19 + TypeScript + Vite
- **Styling & Animation**: Tailwind CSS + Framer Motion + Lucide Icons
- **Backend & Auth**: Supabase (PostgreSQL, Auth, Edge Functions)
- **External Services**: Google Maps/Places API, Meta (Facebook/Instagram OAuth)

---

## 📂 Directory Structure

```text
.
├── index.tsx                 # Main application entry point
├── src/                      
│   ├── features/             # Feature-sliced modules (bites, chat, feed, auth, etc.)
│   ├── shared/               # Shared UI components, hooks, and types
│   └── services/             # Core service singletons (Supabase clients, MetaService, etc.)
├── docs/                     # Handover documents, guides, and project status reports
├── supabase/                 
│   ├── functions/            # Supabase Edge Functions (Proxies, health checks)
│   └── migrations/           # PostgreSQL database schema migrations
├── scripts/                  # CI/CD and operational node scripts (e.g., guardrails)
├── public/                   # Static assets, images, and data
└── vercel.json               # Vercel deployment configuration
```

---

## 🔑 Key Mechanisms to Know

1. **The Recipe Engine (Zero Latency)**: We have completely decoupled from Spoonacular. Fuzo uses a bespoke, zero-latency client-side search engine. Recipes are loaded from `curatedRecipes.json` and filtered instantly without backend trips.
2. **Zero-LLM Link Extraction**: External media imports (like YouTube via "Share a Link") now completely bypass Gemini and AI APIs. We use local metadata extraction (via proxy/oEmbed) and local heuristics for taxonomy tagging, creating a rate-limit proof pipeline.
3. **Proxy Functions**: External API calls (like Google Maps/Places) are routed through our secure Supabase Edge Functions (`supabase/functions/`) to protect API keys.
4. **Social Connectivity**: Meta/Instagram OAuth is deeply integrated via `MetaService.ts` for pulling Instagram grids into user profiles.
5. **Chat & Realtime**: The platform features a comprehensive real-time chat and notification system powered by Supabase Realtime websockets.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` or `.env.local` file at the root. You will need the Supabase URL, Supabase Anon Key, and Google Maps API Key to run the app. (Refer to `README.md` for the exact variable names).

### 3. Run the Development Server
```bash
npm run dev
```
*(The app will be available at `http://localhost:5173` or `3000`)*

### 4. Verify the Codebase (The Fuzo Standard)
Before committing any new code, ensure you pass the Fuzo regression suite:
```bash
npm run check:no-regression
```
This runs `lint`, `build`, and our custom `phase1-guardrails`.

---

*Ready to code? Check `docs/TODO.md` or ask your lead developer where to jump in!*
