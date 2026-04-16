# Developer Guide: Notifications Feature Ready Reckoner

This guide serves as a technical reference for the **FUZO Notifications** — a dynamic alert system that keeps users informed about messages, connection requests, and system updates.

---

## 🏗️ Technical Root
The feature is modularized within `src/features/notifications/`.

- **Main Entry Point**: `src/features/notifications/components/NotificationsView.tsx`
- **Data Source**: Integrated directly with the `friends` list from `index.tsx`.
- **UI Logic**: Animated drawer powered by **Framer Motion**.

---

## 🧭 Intelligence Architecture

Unlike a separate database-driven storage, the current notification system is **Derived State**:

| Notification Type    | Logic Source                                                                 |
|:---------------------|:-----------------------------------------------------------------------------|
| **New Message**      | Calculated from `friends` with `unreadCount > 0`.                           |
| **Connection Req**   | Derived from friends with `requestStatus: 'pending'`.                       |
| **Deep Linking**     | Uses `onOpenChat` callback to trigger tab switches and conversation focus. |

---

## 🏎️ Interaction Flow

1. **Detection**: The system monitors the `friends` array in real-time.
2. **Alerting**: The notification bell in the bottom navigation shows a red counter if `totalUnread > 0`.
3. **Drawer**: On click, `NotificationsView` slides in from the right.
4. **Action**:
   - Clicking a message notification calls `onOpenChat(id, type)`.
   - The handler in `index.tsx` sets the `chatActiveId`, switches the tab to `'chat'`, and closes the notifications drawer.

---

## 📡 Dependencies
- **Lucide React**: Iconography for different alert types (MessageSquare, UserPlus).
- **Framer Motion**: Spring-based animations for the "Backdrop" and "Sidebar".
- **Chat Service**: Provides the underlying data state for the notifications.

---

## 🛠️ Modification Guide

### Adding New Notification Types
Update the `useMemo` block in `NotificationsView.tsx` to include new filtering logic based on global state (e.g., new reward alerts or profile views).

### Customizing Animations
The "Sidebar" motion parameters (damping, stiffness) can be adjusted in the `motion.div` component within `NotificationsView.tsx`.

### Empty State
The "All Caught Up" illustration is rendered conditionally when the computed `notifications` array is empty.

---

> [!TIP]
> **Performance**: The notifications are computed using `useMemo` to ensure that heavy re-filtering doesn't happen unless the `friends` list actually changes.
