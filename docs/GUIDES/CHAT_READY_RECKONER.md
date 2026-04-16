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

## 🧭 Layout & UI Architecture

The Chat UI was modernized to a **AAA Full-Screen** responsive design:

- **Desktop (md+)**: Dual-pane setup with a fixed-width inbox sidebar (`w-96`) and a flexible conversation pane.
- **Mobile (<md)**: Single-pane navigation that toggles between the inbox and active conversation using a back button.
- **Activation**: Exclusively accessible via the app's main navigation menu (legacy floating buttons removed).

---

## 🏎️ Intelligence Architecture

The Chat feature is built on **Supabase Realtime** and **Postgres Functions**:

| Feature            | Implementation Logic                                |
|:-------------------|:---------------------------------------------------|
| **DMs**            | Logic gated by `getOrCreateConversation` helper    |
| **Group Chats**    | Collective messaging via `group_messages` table    |
| **Typing**         | Ephemeral presence handling in `ChatService`       |
| **Studio Sharing** | Detection of `sharedItem` metadata in JSON payload |
| **Deep Linking**   | Functional support for `initialActiveId` via props |

---

## 📊 Shared Studio Items

Chat is tightly integrated with the Bites, Trims, and Scout studios.
- Items shared from the feed or studio are rendered as interactive cards.
- **Deep Linking**: "View" button triggers a tab switch via `setTab`.
- **Plate Sync**: "Save" button allows users to persist shared items to their own plate.
- **Notification Integration**: Clicking a "New Message" notification automatically opens the relevant chat window.

---

## 📡 Dependencies
- **Supabase Client**: Essential for real-time subscriptions.
- **Lucide React**: Navigation and status iconography.
- **Framer Motion**: Smooth transitions for the full-screen layout and notification drawer.

---

## 🛠️ Modification Guide

### Managing Layout State
The full-screen layout relies on `activeId` and `activeType`. In mobile mode, `!activeId` renders the inbox, while a truthy `activeId` renders the chat pane.

### Deep Linking Logic
The `ChatView` accepts `initialActiveId`. When provided, a `useEffect` triggers `openConversation` automatically. Use `onClearInitial` to reset the navigation signal once consumed.

---

> [!IMPORTANT]
> **Supabase Realtime**: Ensure the `conversations` and `group_messages` tables have Replication enabled in the Supabase Dashboard, otherwise incoming messages will not trigger UI updates.
