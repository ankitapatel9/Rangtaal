# UI Redesign Waves 2 & 3 — Design

> **Author:** brainstorming session 2026-04-09
> **Status:** approved by user, ready for implementation plan
> **Scope:** remaining screens + notification system + icon library + tab bar

## Context

Wave 1 (Home, Schedule, Session Detail + design system) is implemented and merged. This spec covers the remaining screens and system-wide updates.

## Design Decisions (approved in visual brainstorming)

- **Palette:** Plum & Gold only (`#2D1B3D` + `#C9963C`). See Wave 1 spec for full token table.
- **Icons:** Lucide (`lucide-react-native`). Thin strokes, minimal, quiet.
- **Tab bar:** Icons only, no text labels. Active icon in gold, inactive in gray.
- **Bottom sheets:** Modal-based (already implemented in Wave 1) instead of Alert.prompt for all form inputs.

## Approved mockups

All mockups saved in `docs/mockups/` for agent reference:
- `09-me-profile.html` — Me/Profile screen
- `10-notifications-and-community.html` — Notification bell, list, routing, admin community
- `11-icon-families.html` — Lucide icon selection
- `12-videos-and-chat.html` — Videos tab, Chat screen
- `13-login-flow.html` — Login, OTP, Welcome

---

## Wave 2: Remaining App Screens

### Screen: Me / Profile

**Layout:**
- Large avatar circle (64px) with initials + name + phone number
- Season stats card: 3-column stat row (Attended | RSVP'd | Uploaded) with dividers
- Payment status card: "Payment" label + current month + "Paid ✓" or "Unpaid" in gold/gray. Gold left border when paid.
- Settings menu: white card with grouped rows (Notifications, My Uploads, Help & Support) with chevrons
- Sign Out: isolated red text in its own card at bottom

**Data:** Uses `useAuth`, `useUser`. Stats computed from sessions data (count of sessions where user's uid is in rsvps and date is past).

### Screen: Notification System

Three parts:

**1. Bell icon (persistent header):**
- Appears on every tab's header bar, next to user avatar
- Gold badge with unread count (hidden when 0)
- Tapping navigates to notification list screen

**2. Notification list screen (`app/notifications.tsx`):**
- Grouped by "NEW" (gold label) and "EARLIER" (gray label)
- Each notification: icon (in themed square), bold title, description, timestamp
- Unread: gold left border. Read: no border, slightly dimmed.
- Notification types and their icons:
  - 📅 Session reminder → routes to `/session/[id]`
  - 🎥 Tutorial uploaded → routes to `/session/[id]`
  - 📸 Photos added → routes to `/session/[id]`
  - ⚠️ Session cancelled → routes to `/session/[id]`
  - 💰 Payment due → routes to Me/Profile
- Tapping marks as read and navigates

**3. Push notification deep linking:**
- When user taps a push notification from outside the app (lock screen, notification center), the app opens directly to the relevant screen
- Push payload includes `route` and `params` fields
- Root layout checks for initial notification on app launch via `messaging().getInitialNotification()`
- Foreground notifications handled via `messaging().onMessage()` — show in-app banner

**Data model:** New `notifications` Firestore collection:
```ts
interface NotificationDoc {
  id: string;
  userId: string;
  type: "session_reminder" | "tutorial_uploaded" | "photos_added" | "session_cancelled" | "payment_due";
  title: string;
  body: string;
  route: string;        // e.g., "/session/abc123"
  read: boolean;
  createdAt: number;
}
```

### Screen: Admin Community

**Layout:**
- "Community" header + member count
- Search bar: white input with magnifying glass icon, filters by name
- User cards: avatar (40px) + name + role label + paid/unpaid pill
  - Paid pill: gold text on warm yellow bg (`#FFF8EB`)
  - Unpaid pill: gray text on warm gray bg (`#F5F0EA`)
- Tapping a card: bottom sheet confirmation to toggle payment status
- No chevrons — the whole card is the tap target

**Data:** Uses `useAllUsers`, `toggleUserPaid`.

### Screen: Videos Tab

**Layout:**
- "Videos" header + bell icon
- Paywall banner (for unpaid users): warm yellow bg, lock icon, "Tutorials are for paid members"
- Tutorials grouped by session date: gold uppercase date label, then tutorial cards below
- Tutorial cards: large video thumbnail (plum gradient placeholder), play button overlay, duration badge, lock badge (unpaid), title + author below
- Paid users: tap plays inline via expo-av
- Unpaid users: tap shows paywall message

**Data:** Uses `useActiveClass`, `useSessions`, `useTutorials`. Iterates sessions, loads tutorials per session.

### Screen: Chat

**Visual direction only — implementation is a future phase.**

- iMessage-style bubbles
- Own messages: plum background, white text, right-aligned, rounded (14px) with bottom-right corner squared
- Others: white background, plum text, left-aligned with small avatar, rounded with bottom-left squared
- Author name above others' messages in gray
- Timestamps below each message in gray
- Date dividers centered with date label
- Message input: rounded pill with white bg, gold send button (circle) on right
- Single community channel for MVP (no threads, no DMs)

---

## Wave 3: Auth Flow

### Screen: Login

**Layout:**
- Centered vertically: logo circle (80px, plum bg) + "Rangtaal" wordmark (32px 800) + "Step into the circle" tagline
- Phone input at bottom third: label "Phone number", white input with +1 prefix separated by border, placeholder formatted as (555) 555-5555
- Gold "Continue" button below input
- Legal text: "By continuing, you agree to receive a verification code via SMS"

### Screen: OTP Verify

**Layout:**
- Gold back arrow + "Back" at top left
- Centered: "Enter code" (26px 800) + "Sent to +1 (555) 555-5555"
- 6 individual digit boxes (48x56px), gold border on focused box, cursor blink animation
- Auto-submits when all 6 digits entered
- "Didn't get the code?" + gold "Resend" link below
- Bottom note: "Code auto-verifies when all 6 digits are entered"

### Screen: Welcome (new user)

**Layout:**
- "Welcome to Rangtaal 🪘" (28px 800) + "Let's get you set up."
- Name input: label "Your name", white rounded input
- Gold "Join Rangtaal" button
- Only shown for users without a Firestore user doc

---

## System-wide Updates

### Tab Bar

- Icons only, no text labels
- Active tab: gold icon (stroke-width 2)
- Inactive tab: gray icon (stroke-width 1.5)
- Lucide icons: Home, Calendar, Video, MessageCircle, User
- Add notification bell to header (not tab bar)

### Icon Library

Install `lucide-react-native` and use throughout:
- Tab bar icons
- Notification bell
- Back arrows
- Lock icons (paywall)
- Send button
- Search icon
- Settings chevrons
- Play/video icons
- Camera/photo icons

Replace all emoji icons (🔔, 📅, 🎥, etc.) with Lucide equivalents in production code. Emoji in mockups was for illustration.

---

## File-level changes

### Wave 2
- Install: `lucide-react-native`
- Create: `app/notifications.tsx` — notification list screen
- Create: `src/types/notification.ts` — NotificationDoc type
- Create: `src/lib/notifications.ts` — markAsRead, getNotifications helpers
- Create: `src/hooks/useNotifications.ts` — extend with notification list (not just token registration)
- Create: `src/hooks/useUnreadCount.ts` — live unread count for bell badge
- Modify: `app/(participant)/me.tsx` — full profile redesign
- Modify: `app/(admin)/community.tsx` — search + payment pills
- Modify: `app/(participant)/videos.tsx` — grouped tutorials with large thumbnails
- Modify: `app/(participant)/_layout.tsx` — icons only tab bar + bell in header
- Modify: `app/(admin)/_layout.tsx` — icons only tab bar + bell in header
- Modify: `app/_layout.tsx` — deep link handling for push notifications

### Wave 3
- Modify: `app/(auth)/login.tsx` — full redesign
- Modify: `app/(auth)/verify.tsx` — OTP boxes redesign
- Modify: `app/(auth)/welcome.tsx` — redesign with Plum & Gold

### Untouched
- All hooks, lib functions, types from Phase 2/3 (data layer unchanged)
- Cloud Functions
- Firestore rules (except adding notifications collection rules)
- `eas.json`, `app.config.js`

## Acceptance criteria

1. All screens use Plum & Gold palette — no legacy pink/purple colors anywhere
2. Tab bar shows Lucide icons only, no text labels
3. Notification bell with badge visible on all tabs
4. Tapping a notification navigates to the correct screen
5. Push notifications from outside the app deep-link to the correct screen
6. Admin community has search and payment toggle via bottom sheet
7. Videos tab groups tutorials by session with large thumbnails
8. Login/OTP/Welcome screens use the new design
9. All existing tests pass
10. `npx tsc --noEmit` exits 0
