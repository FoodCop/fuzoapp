# Developer Guide: Chat Feature Ready Reckoner

This guide serves as a technical reference for the **FUZO Chat** — a real-time messaging system supporting DMs, Group Chats, and Studio Item sharing.

---

## 🏗️ Technical Root
The feature is modularized within `src/features/chat/`.

- **Main Entry Point**: `src/features/chat/components/ChatView.tsx`
- **Logic / Helpers**: `src/features/chat/lib/chatHelpers.ts`
- **Types**: `src/features/chat/types/chatUi.ts`
- **Database Service**: `src/services/chatService.ts` (Supabase Realtime)
- **Feature Export**: `src/features/chat/index.ts`

---

## 🧭 Intelligence Architecture

The Chat feature is built on **Supabase Realtime** and **Postgres Functions**:

| Feature            | Implementation Logic                                |
|:-------------------|:---------------------------------------------------|
| **DMs**            | Logic gated by `getOrCreateConversation` helper    |
| **Group Chats**    | Collective messaging via `group_messages` table    |
| **Typing**         | Ephemeral presence handling in `ChatService`       |
| **Studio Sharing** | Detection of `sharedItem` metadata in JSON payload |

---

## 📊 Shared Studio Items

Chat is tightly integrated with the Bites, Trims, and Scout studios.
- Items shared from the feed or studio are rendered as interactive cards.
- **Deep Linking**: "View" button triggers a tab switch via `setTab`.
- **Plate Sync**: "Save" button allows users to persist shared items to their own plate.

---

## 📡 Dependencies
- **Supabase Client**: Essential for real-time subscriptions.
- **Lucide React**: Navigation and status iconography.
- **Plate Service**: Used when users save shared studio items.

---

## 🛠️ Modification Guide

### Adding Search Criteria
Update `filterFriendsByQuery` in `src/features/chat/lib/chatHelpers.ts` to include new fields (e.g., location or bio).

### Customizing Group Creation
Modify the `createGroup` flow in `ChatView.tsx`. The service supports arbitrary member limits and metadata.

### Message Status Styles
The `getMessageStatusIcon` function in `ChatView.tsx` maps Supabase status (sent, read, error) to Lucide icons.

---

> [!IMPORTANT]
> **Supabase Realtime**: Ensure the `conversations` and `group_messages` tables have Replication enabled in the Supabase Dashboard, otherwise incoming messages will not trigger UI updates.
