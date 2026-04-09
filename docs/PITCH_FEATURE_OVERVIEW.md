# FUZO V2 Feature Overview (Pitch Documentation)

Last updated: 2026-03-09

## Product Summary

FUZO V2 is a mobile-first food discovery and social platform that combines personalized content, local place intelligence, short-form culinary media, AI assistance, and gamified engagement.

## Core Value Proposition

- Personalized culinary discovery across recipes, short videos, and nearby venues.
- Social food interactions through sharing, chat, profile identity, and community ranking.
- AI-augmented creation for both recipe generation and short-form trims concepts.
- A single app flow that connects discovery, saving, sharing, posting, and rewards.

## Core Product Pillars

- Discover: Curated and personalized feed experiences.
- Explore: Location-aware scout map and place details.
- Create: Snap posts and AI studio generation tools.
- Connect: Direct chat and content sharing.
- Progress: Points, leaderboard, and rewards loop.

## End-User Feature Set

## 1. Authentication and Onboarding

- Email/password sign-in flow.
- Password reset from auth screen (`Forgot Password?`).
- Password management in Settings:
  - Change password.
  - Send password reset email.
- Culinary onboarding profile capture:
  - Culinary identity.
  - Dietary preferences.
  - Regional taste preferences.
- Auth/session sync with onboarding-state awareness.

## 2. Personalized Feed (Home Discovery)

- Mixed content feed with multiple card types:
  - Recipe cards.
  - Video cards.
  - Ad cards.
  - Trivia cards.
- Feed normalization pipeline for consistent UI card contracts.
- Fallback logic to ensure ad/trivia coverage when service data is sparse.
- Save/share actions from feed cards.

## 3. Bites (Recipe Discovery)

- Recipe-focused browsing experience.
- Preference-aware filters (cuisine/diet).
- Save to plate flow from recipe items.
- Share recipes directly to friends.

## 4. Trims (Short-Form Video Discovery)

- Personalized short-form culinary video feed.
- Localization inputs:
  - Geolocation context.
  - Profile preferences (location, cuisine, diet).
  - Region-aware query tuning.
- Source-state resilience:
  - Live source.
  - Cache source.
  - Fallback source.
- Rate/caching safeguards in edge proxy for stability and quota control.
- Save/share from trims cards.

## 5. Scout (Local Place Discovery + Map)

- Nearby place discovery map experience.
- Place detail modal with structured content:
  - Overview.
  - Hours.
  - Menu sections.
  - Reviews.
  - Photos.
- Saved places can reappear on user map through persisted coordinates.
- Save/share actions for place cards.

## 6. Snap (User-Generated Posting)

- Mobile capture and desktop upload flows.
- Tagging metadata flow for restaurant/cuisine/rating/description.
- Persisted snap post integration into user activity and points loop.

## 7. Chat and Social Sharing

- Direct message conversations between users.
- Realtime message subscriptions.
- Share item cards into chat (recipes, videos, places, posts).
- Contact list and conversation creation/retrieval model.

## 8. Profile and Social Identity

- Profile display built from user account + settings data.
- Saved content segmented by type (places/recipes/videos/posts).
- Social links support:
  - Instagram
  - Facebook
  - TikTok
  - Pinterest

## 9. Points, Leaderboard, and Rewards

- Event-based points model for key actions:
  - Save item.
  - Share item.
  - Snap post.
- User level progression.
- Global leaderboard ranking.
- Rewards catalog UX for redemption-style engagement loop.

## 10. Settings and Account Management

- Profile edit controls (name, username, bio, contact/location).
- Preference management (diet/cuisine and social links).
- Password control and reset actions.
- Safe sign-out flow.

## AI Capabilities

- Chef AI surface for assistant-style interactions.
- AI Recipe Studio:
  - Generates structured recipe outputs from description and optional image context.
- AI Trim Studio:
  - Generates trim card concepts from description and optional video context.
- Gemini/OpenAI proxy architecture keeps provider keys server-side.

## Platform and Reliability Features

- Supabase-backed auth, persistence, and realtime messaging.
- Edge function proxy architecture for external APIs:
  - YouTube
  - OpenAI
  - Gemini
  - Places/maps and related backend endpoints
- Typed service contracts and normalized data pipelines.
- Live/cache/fallback strategy in key discovery flows.
- Region-aware personalization and cache scoping for trims feed.

## Business/Go-To-Market Talking Points

- Strong retention loop:
  - Discover content -> save/share -> earn points -> climb leaderboard -> redeem rewards.
- Creator and community crossover:
  - User-generated snaps + social chat + AI-assisted ideation.
- Localization potential:
  - Region/location-aware trims and scout capabilities.
- Monetization-ready surfaces:
  - Sponsored/ad inventory in feed.
  - Reward partnerships.
  - Premium AI or creator tool tiers.

## Suggested Pitch Demo Flow (5-7 Minutes)

1. Show onboarding and personalized profile setup.
2. Enter feed and demonstrate mixed-content discovery.
3. Open trims to show localized short-form recommendations.
4. Open scout map and drill into a place detail.
5. Save and share an item to chat.
6. Post a snap and show points increase.
7. End on leaderboard and rewards to communicate retention loop.

## Feature Maturity Snapshot

- Production-ready core: auth, feed, trims, scout, chat, profile, settings, points loop.
- Active improvements: modular extraction from monolithic app shell, rollout audits, and smoke-test coverage expansion.
