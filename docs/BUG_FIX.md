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
