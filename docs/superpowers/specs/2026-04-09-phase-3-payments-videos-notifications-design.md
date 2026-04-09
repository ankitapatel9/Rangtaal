# Phase 3: Payment Flag, Tutorials, Gallery, Notifications — Design

> **Author:** brainstorming session 2026-04-09
> **Status:** approved by user, ready for implementation plan
> **Scope:** four features built in sequence; each independently shippable

## Context

Phase 2 delivered the Class & Schedule system — 24 Tuesday sessions, real-time session lists, and RSVP. The app now needs: a way for admins to track who's paid, tutorial videos tied to sessions (paywalled behind that flag), a community media gallery for session photos/videos, and automated push notifications with SMS fallback for session reminders and cancellations.

## Goal

Make the Rangtaal app a complete weekly-class management tool: admins toggle payment status and upload tutorial videos per session; participants watch tutorials if paid, browse and contribute to a session gallery, and receive push reminders before each session with SMS as fallback for users without the app.

## Non-goals

- **Not** integrating Stripe or any payment processor. Payment is a manual admin toggle.
- **Not** implementing comments, tagging, or video analysis on gallery media (future features — doc shape is prepared).
- **Not** adding categories or search to tutorials (flat list for MVP).
- **Not** sending marketing/promotional notifications — only session reminders and cancellations.

## Build Order

Each feature is independently shippable. They build in this order because of dependencies:

1. **Payment flag** — adds `paid` boolean to user doc + admin toggle UI. Unblocks tutorial paywall.
2. **Tutorial videos** — admin uploads per-session tutorial videos; paid users watch, unpaid see a lock. Depends on payment flag.
3. **Session media gallery** — any user uploads photos/videos from a session; free for all. Independent but shares the session detail screen with tutorials.
4. **Push notifications + SMS fallback** — automated reminders via FCM/APNs + Twilio. Requires new native dep (`@react-native-firebase/messaging`), Cloud Functions deployment.

---

## Feature 1: Payment Flag

### Data model

Add `paid: boolean` field to the existing `UserDoc` type. Default `false`. No new collection.

### Screens

- **`(admin)/community.tsx`** — currently a Phase 1 placeholder. Becomes a user list screen showing all users with their name, role, and payment status (green checkmark or red X). Tapping a user toggles `paid` between `true` and `false` with a confirmation alert.
- **`(participant)/me.tsx`** or **`(admin)/profile.tsx`** — show the user's own payment status as a badge ("Paid" / "Unpaid"). Read-only for participants.

### Firestore rules

Update the `users/{uid}` rules: admins can update any user doc (including `paid`). Participants can update their own doc but cannot change `role` or `paid` — the existing self-update rule checks `request.resource.data.role == resource.data.role`; extend it to also check `request.resource.data.paid == resource.data.paid`.

### Lib / hooks

- `src/lib/users.ts` — add `toggleUserPaid(uid: string, paid: boolean): Promise<void>`
- `src/hooks/useAllUsers.ts` — new hook, admin-only, `onSnapshot` on the `users` collection to get a live user list
- Existing `useUser` hook already returns the user doc — `paid` is available automatically once the type is extended

---

## Feature 2: Tutorial Videos

### Data model

New Firestore collection: **`tutorials`**

```ts
interface TutorialDoc {
  id: string;
  sessionId: string;        // links to a session doc
  title: string;
  description: string;
  videoUrl: string;          // Firebase Storage download URL
  thumbnailUrl: string | null;
  createdAt: number;         // epoch ms, server timestamp
  createdBy: string;         // admin userId
  order: number;             // for manual sorting within a session
}
```

### Storage

Videos uploaded to Firebase Storage under `tutorials/{tutorialId}/{filename}`. Thumbnails under `tutorials/{tutorialId}/thumb_{filename}`.

### Screens

- **Session detail (`app/session/[id].tsx`)** — add a "Tutorials" section below the RSVP area. Shows tutorial videos for this session. Paid users can tap to play; unpaid users see a lock icon overlay and "Contact admin to unlock" message. Admin sees an "Upload Tutorial" button.
- **`(participant)/videos.tsx`** — currently a Phase 1 placeholder. Becomes a chronological list of all tutorials across all sessions, labeled by session date (e.g., "Tuesday, April 21"). Tapping a tutorial plays it (if paid) or shows the paywall. This is the "what we learned each week" view.
- **`(admin)/videos.tsx`** or equivalent — same list as participant but with admin controls (delete, reorder).

### Video playback

Use `expo-av` (Expo's built-in audio/video library). Already included in Expo SDK 54 — **no new native dependency, no EAS Build needed**. Simple `Video` component with play/pause controls.

### Upload flow (admin only)

1. Admin taps "Upload Tutorial" on a session detail screen
2. Picks a video from the camera roll via `expo-image-picker`
3. Enters title and optional description
4. Video uploads to Firebase Storage; Firestore `tutorials` doc is created with the download URL
5. Tutorial appears in the list immediately (real-time via `onSnapshot`)

### Paywall logic

In the tutorial list and session detail, check `userDoc.paid`:
- `true` → show play button, tap plays the video
- `false` → show lock overlay on thumbnail, tap shows "Contact admin to unlock" message

### Firestore rules

```
match /tutorials/{tutorialId} {
  allow read: if isSignedIn();
  allow create, update, delete: if isAdmin();
}
```

Reading is allowed for all signed-in users (the paywall is UI-enforced — the video URL is in Firestore either way). For a production hardening pass, a Cloud Function could generate signed URLs with expiry, but for MVP the UI gate is sufficient.

### Multiple tutorials per session

A session can have multiple tutorials (e.g., one per song or routine). They're ordered by the `order` field within a session. The upload flow auto-increments `order` based on existing tutorials for that session.

---

## Feature 3: Session Media Gallery

### Data model

New Firestore collection: **`media`**

```ts
interface MediaDoc {
  id: string;
  sessionId: string;         // links to a session doc
  type: "photo" | "video";
  storageUrl: string;        // Firebase Storage download URL
  uploadedBy: string;        // userId
  uploadedAt: number;        // epoch ms, server timestamp
  // Future fields — stored as null now, implemented later
  comments: null;
  tags: null;
  analysis: null;
}
```

### Storage

Media uploaded to Firebase Storage under `sessions/{sessionId}/media/{mediaId}/{filename}`.

### Screens

- **Session detail (`app/session/[id].tsx`)** — add a "Gallery" section (below Tutorials). Shows a grid of thumbnails for photos and video previews. Tap to view full-screen. "Add Photo/Video" button for any signed-in user.
- **No standalone gallery tab** — gallery is accessed from the session detail screen. This keeps the gallery contextual ("photos from this session") rather than a flat dump.

### Upload flow (any signed-in user)

1. User taps "Add Photo/Video" on the session detail screen
2. Picks from camera roll via `expo-image-picker` (photo or video)
3. Uploads to Firebase Storage; Firestore `media` doc is created
4. Media appears in the gallery immediately (real-time)

### Access

No paywall — gallery is free for all signed-in users. It's community-contributed content.

### Firestore rules

```
match /media/{mediaId} {
  allow read: if isSignedIn();
  allow create: if isSignedIn();
  allow delete: if isAdmin() ||
    (isSignedIn() && resource.data.uploadedBy == request.auth.uid);
  allow update: if isAdmin();
}
```

Any signed-in user can upload. Only the uploader or an admin can delete. Only admins can update (for future moderation).

---

## Feature 4: Push Notifications + SMS Fallback

### Native dependency

Add `@react-native-firebase/messaging` to the project. This is a **native dependency** — requires one EAS Build (`npm run build:dev`) after installation.

### FCM token registration

On app launch (in the root `_layout.tsx` or a dedicated `useNotifications` hook):
1. Request push notification permission from the user
2. Get the FCM token via `messaging().getToken()`
3. Store the token in the user doc: `fcmToken: string | null`
4. Listen for token refreshes via `messaging().onTokenRefresh()` and update Firestore

### Cloud Functions

New `functions/` directory at the project root. TypeScript, tested with Jest.

#### Scheduled reminder function

Runs on a cron schedule via Firebase Cloud Functions:

- **Day before (evening, 7:00 PM CT):** queries sessions with `date` = tomorrow, `status` = "upcoming", `reminderSent.dayBefore` = false
- **Day of (2 hours before, 5:30 PM CT):** queries sessions with `date` = today, `status` = "upcoming", `reminderSent.dayOf` = false

For each matching session:
1. Get all users in the class
2. Split into: RSVP'd users vs non-RSVP'd users
3. For each user:
   - If `fcmToken` exists → send push via FCM (routes through APNs for iOS)
   - If no `fcmToken` → send SMS via Twilio
4. RSVP'd message: "Reminder: you're signed up for Garba tomorrow/tonight at 7:30 at {location}"
5. Non-RSVP'd message: "Tomorrow's/Tonight's Garba session is at 7:30 — RSVP if you're coming!"
6. Update `reminderSent.dayBefore` or `reminderSent.dayOf` to `true`

#### Cancellation notification function

Triggered by a Firestore `onUpdate` trigger on the `sessions` collection:

- If `status` changed from "upcoming" to "cancelled":
  1. Get all RSVP'd users for that session
  2. Send push/SMS: "Tonight's session has been cancelled: {cancellationReason}"
  3. No `reminderSent` flag update needed — cancellation is a one-time event

#### Admin cancel flow

- Session detail screen (admin view) gets a "Cancel Session" button
- Taps → prompt for cancellation reason → updates session doc: `status: "cancelled"`, `cancellationReason`, `cancelledAt`, `cancelledBy`
- The Firestore trigger fires the cancellation notification automatically

### Twilio integration

- Requires a Twilio account with a phone number
- Twilio Account SID, Auth Token, and From Number stored as Firebase Cloud Functions environment config (not in git)
- The Cloud Function uses the Twilio Node.js SDK to send SMS
- User phone numbers are already in Firebase Auth (phone auth flow stores them)

### APNs

APNs is already configured in Firebase (user confirmed). FCM routes push notifications through APNs automatically — no additional APNs setup needed in the app code.

---

## File-level changes summary

### Feature 1: Payment Flag
- Modify: `src/types/user.ts` — add `paid: boolean`
- Create: `src/lib/users.ts` → add `toggleUserPaid`, `getAllUsers`
- Create: `src/hooks/useAllUsers.ts`
- Modify: `app/(admin)/community.tsx` — user list with payment toggle
- Modify: `app/(participant)/me.tsx` or `app/(admin)/profile.tsx` — show payment badge
- Modify: `firestore.rules` — admin can update `paid` on any user
- Tests: `__tests__/lib/users-paid.test.ts`, `__tests__/hooks/useAllUsers.test.tsx`

### Feature 2: Tutorial Videos
- Create: `src/types/tutorial.ts`
- Create: `src/lib/tutorials.ts` — CRUD helpers
- Create: `src/hooks/useTutorials.ts` — live list by sessionId
- Modify: `app/session/[id].tsx` — tutorials section + upload button (admin)
- Modify: `app/(participant)/videos.tsx` — tutorial list with paywall
- Modify: `firestore.rules` — tutorials collection rules
- Tests: `__tests__/lib/tutorials.test.ts`, `__tests__/hooks/useTutorials.test.tsx`

### Feature 3: Session Media Gallery
- Create: `src/types/media.ts`
- Create: `src/lib/media.ts` — upload, list, delete helpers
- Create: `src/hooks/useMedia.ts` — live list by sessionId
- Modify: `app/session/[id].tsx` — gallery section + upload button
- Modify: `firestore.rules` — media collection rules
- Tests: `__tests__/lib/media.test.ts`, `__tests__/hooks/useMedia.test.tsx`

### Feature 4: Push Notifications + SMS
- Add dep: `@react-native-firebase/messaging` (native — EAS Build required)
- Create: `src/hooks/useNotifications.ts` — token registration + permission
- Modify: `app/_layout.tsx` — mount useNotifications
- Modify: `src/types/user.ts` — add `fcmToken` field
- Create: `functions/` directory — Cloud Functions project (TypeScript)
- Create: `functions/src/reminders.ts` — scheduled reminder function
- Create: `functions/src/cancellation.ts` — Firestore trigger for cancellations
- Create: `functions/src/sms.ts` — Twilio SMS helper
- Modify: `app/session/[id].tsx` — admin cancel button
- Modify: `firestore.rules` — users can update own fcmToken
- Tests: `functions/src/__tests__/reminders.test.ts`, `functions/src/__tests__/cancellation.test.ts`

### Untouched
- All Phase 1 and Phase 2 code not listed above
- `eas.json`, `app.config.js` (except adding messaging plugin)
- `package-lock.json` changes only from new deps

---

## Acceptance criteria

### Payment Flag
1. Admin sees user list on Community tab with payment status
2. Admin taps a user → toggles paid/unpaid → Firestore updates immediately
3. Participant sees "Paid" or "Unpaid" badge on their Me tab
4. Unpaid participant cannot play tutorial videos (lock overlay)
5. All existing tests still pass + new tests for payment toggle

### Tutorial Videos
1. Admin can upload a video from the session detail screen
2. Video appears in the tutorials section of that session
3. Paid user can tap and play the video via `expo-av`
4. Unpaid user sees lock overlay and "Contact admin to unlock"
5. Videos tab shows all tutorials chronologically, grouped by session date
6. Multiple tutorials per session work correctly (ordered by `order` field)

### Session Media Gallery
1. Any signed-in user can upload a photo or video from the session detail screen
2. Media appears in the gallery grid immediately
3. Tap a photo → full-screen view; tap a video → plays
4. Uploader can delete their own media; admin can delete any
5. Gallery is free — no paywall

### Push Notifications
1. App requests push permission on launch
2. FCM token is stored in user doc
3. Day-before reminder fires at ~7 PM CT for upcoming sessions
4. Day-of reminder fires at ~5:30 PM CT
5. RSVP'd users get confirmation message; non-RSVP'd get nudge message
6. Users without FCM token receive SMS via Twilio instead
7. Cancelling a session sends immediate notification to RSVP'd users
8. `reminderSent` flags prevent double-sends
9. All Cloud Functions have TypeScript types and Jest tests

---

## Risks and mitigations

- **Risk: `expo-av` video playback is buggy on certain iOS versions.** Probability: low — it's a mature Expo module. Mitigation: test on the target iPhone before shipping.
- **Risk: Firebase Storage upload is slow for large videos.** Mitigation: show a progress indicator during upload. Consider compressing before upload in a future pass.
- **Risk: Twilio costs for SMS.** Mitigation: SMS is fallback only — most users will have push tokens. Volume is low (one class, ~20-50 users, 2 messages per week max).
- **Risk: Cloud Functions cold start delays the reminder.** Mitigation: scheduled functions warm up before execution. For cancellations (triggered), cold start adds 1-3 seconds which is acceptable.
- **Risk: EAS Build needed for `@react-native-firebase/messaging`.** Same cloud build workflow as before — `npm run build:dev`, 10-15 minutes, install via `eas build:run`.

## Out of scope

- Stripe or payment processing
- Comments, tagging, or analysis on gallery media (doc shape prepared, features deferred)
- Tutorial categories or search
- Marketing/promotional notifications
- Video transcoding or compression
- Offline video caching
