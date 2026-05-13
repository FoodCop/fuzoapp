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

**Status:** ✅ VERIFIED & COMPLETE
