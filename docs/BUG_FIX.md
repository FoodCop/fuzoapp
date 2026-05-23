# FUZO V2 Bug Fix & Feature Log

This document tracks all bug fixes and technical updates performed during the audit.

---

## [2026-05-11] YouTube Channel Sync Integration

**Issue:** Users had to manually find and paste their YouTube channel handle/URL. No direct connection to Google profiles existed for social verification.

**Fix:**
- **Auth:** Expanded Google OAuth scopes to include `youtube.readonly`.
- **Service:** Implemented `YouTubeService.getMyChannel` to identify the user's `@handle` via their Google Access Token.
- **Service:** Created `SettingsService.syncYouTubeWithGoogle` to bridge Supabase session tokens with the YouTube API.
- **UI:** Added a "Sync" action button to the YouTube field in Settings with real-time feedback.

**Status:** ✅ VERIFIED & COMPLETE

---

## [2026-05-11] Meta (Instagram/Facebook) API Integration

**Issue:** Wanting to pull social media content/links directly from Meta profiles.

**Status:** ⏳ PENDING (Awaiting Meta API Keys/App Credentials). Manual entry is currently the active fallback.

---

## [2026-05-11] Social Notification System Migration

**Issue:** Notifications were only generated for DM messages. Group messages, friend requests, and point rewards lacked real-time alerting.

**Fix:**
- **Database:** Created `032_add_social_notification_triggers.sql` adding triggers to `group_messages`, `friend_requests`, and `user_points_ledger`.
- **Logic:** Implemented "Food Card" detection for group shares (e.g., "X shared a card in [Group Name]").
- **Service:** Updated `NotificationService.ts` to map `originalType` ('dm' vs 'group') and handle new alert types.
- **UI:** Enhanced `NotificationsView.tsx` to support deep-linking into both DM conversations and Group chats.

**Status:** ✅ VERIFIED & COMPLETE

---

## [2026-05-13] Profile Rank & Onboarding Audit

**Issue:** 
- Profile rank was showing as a special character (`—`).
- Recipe instructions were missing for Spoonacular and AI-generated bites.
- Onboarding for specific user types (Private Chef, Culinary Team) was not syncing correctly.
- Missing imports causing runtime errors in Scout, Snap, and Trims views.

**Fix:**
- **Profile:** Updated `PointsService.getUserRank` to return both rank and level. Fixed logic in `ProfileView.tsx` to handle the new object structure.
- **Bites:** Updated `BiteRecipe` types to include `analyzedInstructions`. Refined `bitesHelpers.ts` to normalize and flatten Spoonacular's nested instruction structure.
- **Onboarding:** 
    - Added "Food Expertise" (Expertise Levels) to the Individual path.
    - Fixed `AuthOrchestrator.tsx` type-mapping to support `private_chef` and `culinary_team`.
    - Updated immersive backgrounds for all user personas with high-fidelity imagery.
- **Stability:** Added missing `Lucide` icons and `shouldApplyLatestRequest` utilities to multiple features to resolve async race conditions.
- **Chat:** Audited Group Chat functionality; confirmed full support for sharing Food Cards, Bites, and Videos within Studio Groups.
- **Import:** Verified the **AI Photo Import** studio. Confirmed that Pinterest and gallery screenshots are correctly analyzed via `GeminiService.analyzeScreenshot` and syndicated as interactive Photo Cards to the feed.
- **UX:** Redesigned the **Unified Creation Modal**. Simplified the interface to a direct "What do you want to create?" question with large icon cards, removing excessive text and adding "Pin a Spot" as a primary creation option.
- **Scout:** Integrated **Google Places Autocomplete** into the pinning flow. Users can now search for specific restaurants and addresses with pinpoint accuracy. Added auto-fill for restaurant names based on search selection.

---

## [2026-05-13] Scout Route Planning Refinement

**Issue:** 
- Route calculation sometimes fails with "ZERO_RESULTS" when using broad text addresses (e.g., broad regions like "Morocco").
- The Google Routes API v2 is stricter with text-based waypoints than the legacy API.

**Work Done:**
- **Infrastructure:** Integrated Google Routes API v2 and New Places API for corridor-based discovery.
- **Diagnostics:** Added detailed error reporting and server-side logging to the Supabase Edge Function to identify routing failures.
- **Stability:** Fixed property access bugs and implemented `place_id` support for higher routing fidelity.

**Status:** ⏳ PENDING (Under investigation for broad geocoding robustness). Place ID-based routing is functional, but text-based routing requires further fallback logic.

---

## [2026-05-13] Food Map (Plate Heatmap) Audit

**Issue:** Verification requested for the "Mini Map" feature in the Profile/Plate section.

**Work Done:**
- **Verification:** Confirmed `MiniMapWidget.tsx` is correctly integrated into the `ProfileView` under the "Food Map" tab.
- **Enhancement:** Implemented **`fitBounds`** logic to ensure the map automatically zooms to show all saved culinary locations globally.
- **Stability:** Refactored Google Maps Visualization (Heatmap) integration to be type-safe and more performant.
- **UI:** Sharpened the dark-mode map styles to match the premium Fuzo V2 aesthetic.

**Status:** ✅ VERIFIED & COMPLETE

---

## [2026-05-18] Chef AI (Tako AI) Response Simplification & Interactive Redesign

**Issue:** 
- AI assistant responses were excessively verbose, rendering long narrative paragraph blocks that were difficult to scan and digest on mobile screens.

**Fix:**
- **API Schema Constraints:** Configured `GeminiService.generateContent` call within [ChefAIView.tsx](file:///k:/H%20DRIVE/Quantum%20Climb/APPS/FUZO_V2/src/features/chef/components/ChefAIView.tsx) to strictly enforce structured JSON outputs utilizing `responseMimeType: 'application/json'` and a custom-tailored JSON schema containing greeting speech, bullet lists, selectable cards, action commands, and chip suggestions.
- **Parsing Fallback Engine:** Implemented `parseChefResponse` to dynamically digest raw JSON, markdown-wrapped JSON code blocks, and fall back seamlessly to standard text bubble rendering if parsing fails, protecting UI rendering.
- **Selectable Option Cards:** Designed a stunning, glassmorphic layout for option cards (e.g. recipe/dish choices) complete with custom metadata badges (calories, prep times, macros) and hover scaling transitions. Clicking a card instantly launches its associated follow-up query.
- **Concise Actions & Suggestion Chips:** Integrated direct action buttons (*Get Recipes*, *Grocery List*) and dynamic horizontal pill chips at the bottom of the card stack so users can trigger follow-up conversation loops via touch instead of typing.
- **Stability:** Added transaction locks to prevent rapid duplicate tap submissions while the model is loading.

**Status:** ✅ VERIFIED & COMPLETE (Visually and interactively validated using automated browser subagent flows)

---

## [2026-05-18] User Search While Sharing (7.3)

**Issue:** 
- In the content share modals (both global and bites-specific), the search function lacked support for filtering contacts by custom handles and raw database display names, and was visually uninformative about what search query fields were supported.
- **Z-Index Layering Bug:** The share modal had `z-[120]` styling, causing it to render underneath the full-screen recipe detail modal (`z-[500]`), making it completely invisible and unclickable when sharing recipes.

**Fix:**
- **Robust Multi-field Search Filter:** Upgraded `filterFriendsByQuery` in [chatHelpers.ts](file:///k:/H%20DRIVE/Quantum%20Climb/APPS/FUZO_V2/src/features/chat/lib/chatHelpers.ts) and the local helper in [BitesView.tsx](file:///k:/H%20DRIVE/Quantum%20Climb/APPS/FUZO_V2/src/features/bites/components/BitesView.tsx) to match user queries against `username` (system handle), `handle` (metadata handle), `name` (active display name), `display_name` (raw database field), and `email`.
- **Descriptive Input Placeholder:** Refactored placeholder text inside the text search inputs to guide users: `"Search username, name, or handle..."`
- **Z-Index Elevation:** Increased z-index of BOTH share modals from `z-[120]` to `z-[600]`, resolving the modal overlay conflict so that it overlays perfectly over recipe detail views.

**Status:** ✅ VERIFIED & COMPLETE (Visually and interactively validated using automated browser subagent flows)

---

## [2026-05-18] Bites Gallery Search & Gallery UI Redesign

**Issue:**
- The Bites page lacked a direct search bar with autofill autocomplete suggestions.
- Filter chips were rendered initially, cluttering the header, instead of appearing only after a search was entered, and they were not filtered to only represent options relevant to active search results.
- Recipe grid cards and details modals rendered images inside background overlays or side-by-side split rows on desktop, which reduced overall text legibility and consistency.

**Fix:**
- **Search & Autofill Suggestions:** Implemented a full search engine inside `BitesView` that dynamically builds autocomplete suggestion sets from active recipe titles, cuisines, and diets. Added a glassmorphic floating suggestions dropdown underneath the search bar.
- **Search-Triggered Relevant Chips:** Modified the UI state logic so that dietary and cuisine filter chips remain completely hidden initially, appearing dynamically only after a search query is typed, and filtering chips strictly to diets and cuisines represented in the matching recipes.
- **Grid Cards & Detail Modals:** Transformed card layouts in the gallery grid and details modal into elegant vertical stacks where the image sits cleanly at the top with metadata structured at the bottom, achieving ultimate visual legibility and consistency across all viewport sizes.

**Status:** ✅ VERIFIED & COMPLETE (Visually and interactively validated using automated browser subagent flows)

---

## [2026-05-18] Group Chat & Polymorphic Item Sharing System (7.2)

**Requirement Audit:**
- Verify implementation status of the Group Chat system including group creation, media/item sharing (bites, trims, spots), event invites (RSVP), real-time messaging, storage CDNs, and background system notification triggers.

**Findings & Verification:**
- **Group Clusters & Creation:** Verified group management logic in [chatService.ts](file:///k:/H%20DRIVE/Quantum%20Climb/APPS/FUZO_V2/src/features/chat/services/chatService.ts) and [ChatView.tsx](file:///k:/H%20DRIVE/Quantum%20Climb/APPS/FUZO_V2/src/features/chat/components/ChatView.tsx). Membership is managed atomically in the `group_members` table with active Postgres RLS rules.
- **Polymorphic Item Sharing:** In-feed item sharing handles recipes/bites, trims/videos, and spot/food cards cleanly via the unified polymorphic `AppItem` model, rendering action CTAs (View, Save, Share) inside message bubbles.
- **Event Invites & RSVPs:** Interactive RSVP cards are powered by [EventInviteCard.tsx](file:///k:/H%20DRIVE/Quantum%20Climb/APPS/FUZO_V2/src/features/chat/components/EventInviteCard.tsx) and [rsvpService.ts](file:///k:/H%20DRIVE/Quantum%20Climb/APPS/FUZO_V2/src/services/rsvpService.ts) with direct database state upserts to `event_rsvps`.
- **Infrastructure Integrations:** Confirmed real-time channel sync for DMs and groups, HTML5 native system notifications for background states, and Cloudflare-backed Supabase CDN media storage.

**Status:** ✅ VERIFIED & COMPLETE (Stack audited and confirmed 100% operational)

---

## [2026-05-19] Realtime Stability, Mobile Feed UX, & Multi-Tab Recipe Detail Modals

**Issue:**
- **Realtime WebSocket Storms:** Modifying online statuses or receiving text messages triggered recursive WebSocket teardown and reconnect loops.
- **Chat Race Conditions:** Rapidly tapping multiple contacts triggered out-of-order asynchronous networking updates that corrupted conversation views.
- **Mobile Discovery Sizing & Controls:** Rigid aspect ratios caused feed cards to overflow viewport boundaries on smaller devices, and standard swipe triggers lacked an consolidated horizontal FAB deck with programmatically simulated swipe animations.
- **Legacy Modal Layout & Close button:** Detail modals lacked dynamic tabs, causing ingredients, preparation steps, and nutrition widgets to overflow vertically. Close buttons sat statically inside the header image container and unmounting modals lacked elegant zoom-out exits.
- **Visual Design Details:** Modals stretched flatly to mobile screen borders without margins, instruction lists lacked unified indexes, active tab selectors were bland, and Unsave buttons was colored in light red instead of strong primary saturated red with white text.

**Fix:**
- **WebSocket Refactoring:** Implemented a persistent React `friendsRef` to hold the contact list in [index.tsx](file:///k:/H%20DRIVE/Quantum%20Climb/APPS/FUZO_V2/index.tsx#L267), separating user data queries from active subscription lifecycles to eliminate reconnect loops.
- **Sequence Integrity Guards:** Added sequence locking checks inside `openConversation` in [ChatView.tsx](file:///k:/H%20DRIVE/Quantum%20Climb/APPS/FUZO_V2/src/features/chat/components/ChatView.tsx#L86) to discard slower out-of-order network calls.
- **Responsive Card Sizing & Programmatic Swipes:** Refactored cards in [SwipeCard.tsx](file:///k:/H%20DRIVE/Quantum%20Climb/APPS/FUZO_V2/src/features/feed/components/SwipeCard.tsx#L12) to expose a forwardRef `.swipe(dir)` command and constrained feed heights to `h-[58vh]` in [FeedView.tsx](file:///k:/H%20DRIVE/Quantum%20Climb/APPS/FUZO_V2/src/features/feed/components/FeedView.tsx#L438). Added a bottom-floating glassmorphic Swipe FAB pill menu (Skip, Save, Share) linked to programmatic swipe vectors.
- **Sleek Detail Tabs:** Integrated a multi-tab selector (**Ingredients**, **Instructions**, **Nutrition**) in [SavedItemDetailModal.tsx](file:///k:/H%20DRIVE/Quantum%20Climb/APPS/FUZO_V2/src/features/profile/components/SavedItemDetailModal.tsx#L87), collapsing layout heights and grouping nutritional data beautifully.
- **Custom-Numbered Step Badges:** Parsed and cleaned prep text strings into uniform, separate cards sporting circular yellow index step badges.
- **Composited Header Badges:** Moved prep time and servings count from lower text lists to float as elegant, glassmorphic labels directly on top of the image overlay.
- **Floating card margins & rounded dialogs:** Configured symmetric side padding margins (`p-4 pb-8 md:p-8`), rounded modal dialog card corners to `rounded-[2.5rem]` all around, and set max height to a safe `max-h-[90dvh]`.
- **Close buttons & Exit animations:** Positioned a circular dark glassmorphic Close button absolutely at `top-6 right-6 z-50`. Added a local `isClosing` state to trigger a 250ms delayed close callback, letting smooth CSS exit zoom/fade-out transitions complete.
- **Bold Visual Highlights:** Updated the footer's Unsave/Remove button to show a solid primary red background (`bg-red-600 hover:bg-red-700`) with bold white text, and highlighted the selected tab button in solid brand yellow (`bg-yellow-400 text-white shadow-sm`).

**Status:** ✅ VERIFIED & COMPLETE (Visually and interactively validated using automated browser subagent flows and compiler checks)

