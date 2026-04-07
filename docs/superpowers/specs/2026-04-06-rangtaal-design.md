# Rangtaal App — Design Specification

**Date:** 2026-04-06
**Status:** Draft for review
**Author:** Anki Patel (with Claude)

---

## 1. Overview

Rangtaal is a community mobile app for a Garba (Gujarati folk dance) workshop group based in Roselle, IL. The app replaces the current manual workflow (Google Forms for registration, Google Sheets for tracking, Instagram flyers for announcements) with a single integrated experience.

The app serves two roles from a single codebase:

- **Participants** — sign up, pay monthly fees, RSVP for weekly classes, watch tutorial videos, share their own videos/photos, and chat with the community.
- **Admins** — manage participants and payments, compose and send SMS reminders (with AI assistance), cancel sessions, upload tutorial videos, and track studio finances.

The current season runs every Tuesday, 7:30–9:30 PM, from April 21, 2026 through September 2026, at Roselle Park District (Maple Room, 555 W. Bryn Mawr Ave, Roselle, IL 60172). Monthly fee is $60.

---

## 2. Goals & Non-Goals

### Goals
- Replace Google Forms / Google Sheets workflow with a single app
- Make it easy for participants to RSVP, pay, and stay informed
- Build community through shared videos, photos, and chat
- Give admins a fast way to send weekly SMS reminders without typing from scratch every week
- Track finances (revenue vs. venue costs) so admins always know where the season stands
- Support phone-only sign-up to remove friction

### Non-Goals (v1)
- Web admin dashboard (mobile-only for v1, web added later if needed)
- Multiple simultaneous class batches (current model is one batch ≤ 30 people)
- Class capacity limits / waitlists
- Navratri event ticket sales (planned for future)
- Multiple chat channels (one community room for v1)
- Video compression or auto-cleanup
- Refund processing automation (manual for v1)

---

## 3. User Roles

### Participant (default role on sign-up)
- Sign up with phone number
- View class schedule
- RSVP for sessions (gated by monthly payment)
- Pay monthly fee via Stripe (saved card) or offline (Zelle/cash, admin confirms)
- Watch admin tutorial videos (paywalled — blurred if unpaid)
- Upload own videos/photos to chat or session gallery
- Participate in community chat
- Receive SMS reminders and push notifications
- Get notified when sessions are cancelled

### Admin (role assigned manually in Firestore)
- All participant capabilities, plus:
- View and manage all participants
- Mark offline (Zelle/cash) payments as received
- **Mark a participant as opted out for a specific month** (and undo it)
- Compose weekly SMS messages via AI chat + voice
- Send manual payment reminders to unpaid participants
- Configure auto payment reminder trigger date
- Cancel sessions (auto-notifies all participants)
- Upload tutorial videos linked to sessions
- Log weekly venue costs
- View monthly profit/loss summary
- Moderate chat messages and video comments

---

## 4. Core Features

### 4.1 Authentication
- **Method:** Phone number + OTP via Firebase Auth (only)
- **No email, no password, no social login** for v1
- New users complete onboarding: enter name → land on home screen
- Returning users with verified number sign in directly

### 4.2 Class Schedule & RSVP
- Calendar view of all Tuesday sessions for the season
- Each session shows date, time (7:30–9:30 PM), location, and custom message (if set by admin)
- "RSVP" button is enabled only if user has paid for the current month
- If unpaid, the button shows "Pay $60 to RSVP" and opens the payment sheet
- Past sessions are read-only; cancelled sessions are clearly marked

### 4.3 Payments

**Pricing:** $60/month, monthly billing aligned to calendar months.

**Payment methods:**
- **Stripe in-app** — User saves a card in Profile/Me settings on first use; future payments are one-tap
- **Offline (Zelle/cash)** — User selects "I'll pay offline"; status set to `pending_admin_confirmation`; admin marks paid via the People tab

**Where users can pay:**
- Profile/Me tab (set up payment method, pay monthly fee)
- Schedule tab (when trying to RSVP for an unpaid month)
- Home tab (payment status banner with "Pay Now" button)

**Stripe integration:**
- Stripe Customer created on first card save
- Payment Intent created via Cloud Function (server-side)
- Webhook from Stripe → Cloud Function → updates Firestore
- Idempotency keys prevent duplicate charges

### 4.4 SMS Notifications (Twilio)

**Reminder schedule (per session):**
- Day before the session
- Day of the session

**Message source:**
- **Custom message** — Admin composes via the Compose tab (AI chat + voice)
- **Default fallback** — If no custom message exists by send time, Cloud Function sends a default template:
  > "Reminder: Garba class tomorrow [or tonight] at 7:30 PM at Roselle Park District, Maple Room. See you there!"

**Other SMS triggers:**
- **Session cancellation** — Sent to all active participants with date and time of cancelled session
- **Payment reminder (auto)** — Sent on configurable trigger date each month to unpaid participants
- **Payment reminder (manual)** — Admin can nudge specific people on demand

**Compliance:**
- Twilio handles STOP/opt-out automatically
- Opted-out users skipped on future sends
- All sends logged in `smsLogs` collection for audit

### 4.5 AI Message Composer (Admin only)
- Chat interface in the Compose tab
- Admin can **type** or **tap mic to speak** their idea
- AI (Claude API via Cloud Function) drafts the SMS message
- Admin can refine via follow-up chat ("make it shorter", "add a note about water bottles")
- Final draft attached to the upcoming session — Cloud Function auto-sends day-before and day-of

### 4.6 Tutorial Videos (Admin upload)
- Admin uploads videos via the Videos tab → linked to a specific session ("Week 1: Dodhiyu Basics")
- Videos stored in Firebase Storage
- **Paywall:** Only users with `paid` status for the current month can play videos
- Unpaid users see **blurred thumbnails** with "Pay to unlock" overlay
- Paywall enforced by Firestore Security Rules + signed Storage URLs (not just UI)
- Users can comment on tutorial videos (Firestore subcollection)

### 4.7 Participant Media Uploads
- Participants can upload videos and photos from gallery OR record/take them inside the app
- Two destinations (chooser at upload time):
  - **Share to chat** — appears as a media message in the community chat
  - **Add to session gallery** — attached to a specific Tuesday's session for everyone to see
  - **Both** — uploaded once, appears in both
- **No compression**, **no auto-deletion**
- Stored in `userMedia` collection separate from admin tutorials
- Not paywalled (community content)

### 4.8 Community Chat
- Single group chat room for the whole community
- Real-time messages via Firestore listeners
- Supports text, photos, and videos
- Admins can delete messages and ban users (rare moderation)
- Long-press a message to report or copy

### 4.9 Admin Finance Tracking
- **Revenue** — auto-aggregated from `payments` collection
- **Venue costs** — admin logs weekly amounts via Finance tab
- **Profit/Loss summary** — viewable per month or full season
- Simple ledger view: collected $X, paid $Y, net $Z

### 4.10 Monthly Opt-Out (Admin only)

Sometimes a participant needs to skip a month (travel, illness, etc.) without dropping out of the community. They tell the admin (text, in person, however), and the admin marks them as opted out for that month from the People tab.

**Behavior while opted out:**
- No payment owed for that month
- RSVP button is disabled with the message "You're opted out for [Month] — see you in [Next Month]"
- Skipped from auto + manual payment reminders for that month
- Skipped from session reminders (day-before / day-of) for that month
- Still receives session cancellation notices (informational)
- **Still has full access to tutorial videos** (the opt-out doesn't lock them out of community content)
- Still has full access to community chat
- The opt-out auto-expires at the end of the month — they resume normally next month unless re-opted-out

**Admin flow:**
- People tab → tap participant → "Mark opted out for [Month]" button
- Optional reason field
- Confirms → Cloud Function writes to `monthlyOptOuts` collection
- Undoable by admin from the same screen ("Remove opt-out")

**Participant-facing UI:**
- Home tab shows a clear banner: "You're opted out for April. See you in May!"
- No "Pay Now" pressure, no missed payment alerts

### 4.11 Session Cancellation
- Admin taps a session in the calendar → "Cancel Session"
- Optional reason field
- On confirm, Cloud Function:
  - Marks session `status: "cancelled"` and records `cancelledBy`, `cancelledAt`
  - Sends SMS to all active participants including session date and time
  - Sends FCM push notification
  - Logs to `smsLogs`
- Calendar shows cancelled sessions as crossed-out

---

## 5. Architecture

```
┌──────────────────────────────────┐
│     Rangtaal Mobile App          │
│     (Expo / React Native)        │
│                                  │
│  ┌──────────────┐  ┌───────────┐ │
│  │ Participant  │  │   Admin   │ │
│  │    Views     │  │   Views   │ │
│  └──────────────┘  └───────────┘ │
│     (shown based on user role)   │
└──────────────┬───────────────────┘
               │
         Firebase Auth
         (phone OTP)
               │
 ┌─────────────▼─────────────────┐
 │       Firebase Backend        │
 │                               │
 │  Firestore  │  Cloud Storage  │
 │  Functions  │  FCM            │
 └──────┬────────────────────────┘
        │
    ┌───┴────┬─────────┐
    ▼        ▼         ▼
 Stripe   Twilio   Claude API
```

### Component responsibilities

**Mobile App (Expo)**
- All UI for both roles
- Direct reads/writes to Firestore (with security rules enforcing access)
- Direct uploads to Cloud Storage
- Triggers Cloud Functions for sensitive ops (payments, SMS, admin actions)

**Firebase Auth**
- Phone OTP sign-in
- Issues JWTs used by Firestore and Cloud Functions
- Custom claim `role: admin` on admin accounts

**Firestore**
- All structured app data (users, sessions, payments, chat, etc.)
- Real-time listeners for chat and live updates
- Offline cache for participant data

**Cloud Storage**
- Tutorial videos (admin-only writes, paywalled reads)
- User media (participant uploads)
- Profile photos (future)

**Cloud Functions**
- Stripe webhook handler
- SMS sending (Twilio integration)
- Scheduled jobs: send daily reminders, monthly payment auto-reminder
- Session cancellation handler
- AI chat proxy (Claude API calls — keeps API key server-side)
- Admin role assignment

**FCM (Firebase Cloud Messaging)**
- Push notifications to mobile devices
- Triggered alongside SMS for important events

---

## 6. Data Model (Firestore)

```
users/
  {userId}
    - name: string
    - phoneNumber: string
    - role: "participant" | "admin"
    - createdAt: timestamp
    - fcmTokens: string[]
    - stripeCustomerId: string
    - defaultPaymentMethodId: string
    - smsOptedOut: boolean

classes/
  {classId}
    - name: "Garba Workshops 2026"
    - location: "Roselle Park District, Maple Room"
    - address: "555 W. Bryn Mawr Ave, Roselle, IL 60172"
    - dayOfWeek: "Tuesday"
    - startTime: "19:30"
    - endTime: "21:30"
    - seasonStart: 2026-04-21
    - seasonEnd: 2026-09-30
    - monthlyFee: 60
    - active: boolean

sessions/
  {sessionId}
    - classId: string
    - date: timestamp
    - status: "upcoming" | "completed" | "cancelled"
    - cancellationReason: string (optional)
    - cancelledAt: timestamp (optional)
    - cancelledBy: userId (optional)
    - rsvps: userId[]
    - customMessage: string (optional)
    - reminderSent: { dayBefore: boolean, dayOf: boolean }

payments/
  {paymentId}
    - userId: string
    - classId: string
    - month: "2026-04"
    - amount: number
    - method: "stripe" | "zelle" | "cash"
    - status: "paid" | "pending_admin_confirmation" | "failed" | "refunded"
    - stripePaymentIntentId: string (optional)
    - paidAt: timestamp
    - recordedBy: userId (optional, for manual entries)

venueCosts/
  {costId}
    - classId: string
    - sessionId: string
    - amount: number
    - paidAt: timestamp
    - notes: string (optional)

monthlyOptOuts/
  {optOutId}
    - userId: string
    - classId: string
    - month: "2026-04"
    - reason: string (optional)
    - createdAt: timestamp
    - createdBy: userId (admin who recorded it)
    - active: boolean   // false if admin removed the opt-out

videos/                          # admin tutorial videos (paywalled)
  {videoId}
    - title: string
    - description: string
    - sessionId: string
    - storageUrl: string
    - thumbnailUrl: string
    - durationSeconds: number
    - uploadedBy: userId (admin)
    - uploadedAt: timestamp
    - type: "tutorial"
    - requiresPayment: true
    - views: number

videos/{videoId}/comments/        # subcollection
  {commentId}
    - userId: string
    - userName: string
    - text: string
    - createdAt: timestamp

userMedia/                       # participant uploads (community)
  {mediaId}
    - userId: string
    - userName: string
    - sessionId: string (optional)
    - destination: "chat" | "session" | "both"
    - storageUrl: string
    - thumbnailUrl: string
    - mediaType: "video" | "photo"
    - createdAt: timestamp
    - chatMessageId: string (optional)

chatRooms/
  {roomId: "general"}
    - name: "Rangtaal Community"
    - createdAt: timestamp

chatRooms/{roomId}/messages/      # subcollection
  {messageId}
    - userId: string
    - userName: string
    - text: string (optional)
    - mediaId: string (optional, links to userMedia)
    - createdAt: timestamp
    - deleted: boolean

smsLogs/
  {logId}
    - userIds: string[]
    - messageType: "reminder_day_before" | "reminder_day_of" | "payment_due_auto" |
                   "payment_due_manual" | "cancellation" | "fallback"
    - body: string
    - sentAt: timestamp
    - twilioSid: string
    - status: "sent" | "failed"

aiConversations/
  {conversationId}
    - adminUserId: string
    - sessionId: string
    - messages: [{ role: "user" | "assistant", content: string, timestamp }]
    - finalDraft: string (optional)
    - createdAt: timestamp

settings/
  {doc: "global"}
    - autoReminderTriggerDay: number   # day of month, e.g., 3
    - defaultReminderMessage: string
    - currentClassId: string
```

---

## 7. Screens & Navigation

The app uses **two distinct tab bars**, swapped at runtime based on the user's role. This is cleaner than nesting admin features under a single tab bar with a "More" overflow.

### Participant Tab Bar (5 tabs)
- **Home** — Next class card, payment status banner, latest announcement
- **Schedule** — Calendar of Tuesdays, tap to view/RSVP
- **Videos** — Tutorial library (paywalled) and session galleries
- **Chat** — Community group chat
- **Me** — Profile, payment methods, payment history, notification settings, logout

### Admin Tab Bar (5 tabs)
- **Home** — Admin dashboard (RSVPs this week, payments this month, quick actions)
- **Community** — All participants list with payment status, search, mark Zelle/cash received, monthly opt-out controls
- **Finance** — Revenue, venue costs, monthly P&L, log venue cost, AI SMS composer entry
- **Sessions** — Calendar with admin controls (cancel session, attach custom message, view RSVPs)
- **Profile** — Admin's own profile, settings, auto-reminder trigger date, sign out

The Compose (AI SMS) and People-management flows are reachable from the Finance and Community tabs respectively, rather than having dedicated tabs.

### Key non-tab screens
- Welcome / Onboarding (phone verify → name → "Welcome to Rangtaal")
- Session detail (with admin actions if applicable)
- Participant detail (admin, opens from Community tab)
- Pay Now sheet
- Video player
- Media upload sheet (Capture the Rhythm)
- AI chat conversation (Compose with AI)
- Cancel session confirmation

---

## 8. Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | Expo (React Native), TypeScript |
| State / data fetching | Firestore SDK + React Query (or Firebase hooks) |
| Backend | Firebase Cloud Functions (Node.js, TypeScript) |
| Database | Firestore |
| Auth | Firebase Auth (phone OTP) |
| File storage | Firebase Cloud Storage |
| Push notifications | Firebase Cloud Messaging |
| Payments | Stripe (Stripe Mobile SDK + server webhooks) |
| SMS | Twilio (called from Cloud Functions) |
| AI message composer | Anthropic Claude API (called from Cloud Functions) |
| Camera / video recording | expo-camera, expo-image-picker, expo-av |
| Voice input | expo-speech / native speech recognition |
| Build / deploy | Expo EAS Build, Firebase CLI |

---

## 9. Security & Access Control

- **Firestore Security Rules** enforce role-based access at the database level
  - Participants can read their own user doc, payments, and RSVPs only
  - Participants can read sessions, public videos (if paid), chat messages, user media
  - Admins can read/write everything
- **Storage Security Rules** gate tutorial video access by current-month payment status
- **Cloud Functions** are the only path for:
  - Creating/confirming payments (Stripe interactions)
  - Sending SMS (Twilio credentials never exposed to client)
  - Calling Claude API (API key never exposed to client)
  - Cancelling sessions (audit-logged side effects)
  - Assigning admin role
- **Custom claims** on Firebase Auth tokens carry the `role: admin` flag

---

## 10. Error Handling & Edge Cases

### Authentication
- OTP fails or expires → clear error + resend
- Existing phone → "welcome back" sign-in
- No internet → offline message + retry
- Account deleted by admin → forced logout with explanation

### Payments
- Stripe payment fails → error + retry + offline fallback
- Stripe webhook delayed → "processing" UI state
- Duplicate payment → idempotency keys prevent
- Admin marks paid when already paid via Stripe → warning + override
- Refund needed → admin marks as refunded (manual)

### Sessions & RSVP
- User RSVPs then payment expires next month → past RSVPs preserved, new ones blocked
- Session cancelled after RSVP → user notified, RSVP removed
- Past session RSVP attempt → button disabled
- Concurrent admin cancellation → Firestore transaction prevents double-action

### Monthly Opt-Out
- User RSVP'd, then admin marks them opted out → existing RSVPs auto-removed for that month
- User opted out and tries to pay → app shows "You're opted out for [Month]; ask admin to lift the opt-out first"
- Admin marks user opted out for a month already paid → flag warning, allow override (rare; admin-decided refund)
- Opted-out user receives a session cancellation notice → still sent (informational only)
- Auto payment reminder Cloud Function → checks `monthlyOptOuts` and skips opted-out users

### SMS / Notifications
- Twilio down → exponential backoff retry, log failures, admin sees alert
- Invalid phone → mark user, skip, alert admin
- Empty custom message at send time → fallback default sent
- User STOP'd → skipped on all future sends

### Videos & Chat
- Video upload mid-fail → resumable upload via Firebase Storage
- Unpaid user attempts video view → blurred thumb + paywall sheet
- Inappropriate message → admin delete + user report
- Failed chat send → local indicator + retry
- Comment spam → rate limit (5/min) via Cloud Function

### Data Integrity
- Payment recorded for wrong month → admin edit with audit trail
- Phone number change → re-verify via OTP
- Accidental session deletion → soft delete with 7-day undo

---

## 11. Testing Strategy

### Unit tests
- Payment status calculation
- RSVP eligibility logic
- SMS message generation (custom vs. fallback)
- Date/time handling

### Integration tests (Firebase Emulators)
- Sign up flow → user created
- Stripe webhook → Firestore update → RSVP unlocked
- Session cancellation → notifications + status update
- Scheduled functions for reminders

### End-to-end tests
- Full participant journey: sign up → pay → RSVP → notification → video
- Full admin journey: log in → compose → send → mark payment → log venue cost
- Media upload journey: record → upload → appears in destinations

### Manual checklist (each release)
- iOS physical device
- Android physical device
- Real Stripe test mode payment
- Real Twilio test SMS
- Offline mode test (airplane mode)
- Both roles tested (participant + admin)

### Tooling
- Firebase Local Emulator Suite for offline dev
- Stripe test mode (no real charges)
- Twilio test credentials
- Seed scripts for fixture data

---

## 12. Out-of-Scope (Future Considerations)

These are intentionally deferred from v1 but the architecture should not block them:

- **Web admin dashboard** — Next.js app talking to the same Firebase backend
- **Multiple class batches** — Refactor `classes` to support concurrent active classes
- **Capacity limits / waitlists** — Add `maxCapacity` to sessions, queue logic
- **Navratri ticket sales** — New `events` collection + Stripe Checkout
- **Multiple chat channels** — `chatRooms` is already a collection, just add more docs
- **Video compression / auto-cleanup** — Cloud Function on storage triggers
- **Refund automation** — Stripe refund API integration
- **Branding & UX guidelines** — Separate phase using Google Stitch (next step after this spec)

---

## 13. Open Questions / Risks

| Topic | Status |
|---|---|
| Branding & visual design | To be done in a separate phase using Google Stitch |
| Final tab structure (5 vs 6 tabs for admin) | UX decision during branding phase |
| Firebase Storage cost growth from uncompressed videos | Acknowledged; revisit if monthly bill exceeds expectations |
| Apple App Store / Google Play approval timeline | TBD; submit early for first season use |

---

## 14. Design References

Visual references for the screens described in this spec live in `docs/designs/` and were generated in Google Stitch (project ID `12751402334591183086`). They are reference mockups, not pixel-perfect specifications — implementation should follow the spirit and brand identity of the designs while adapting layouts to React Native conventions.

| Screen in spec | Reference file |
|---|---|
| Login (phone OTP) | `login.png` |
| Welcome / name entry | `welcome-to-rangtaal.png` |
| Participant Home | `participant-home.png`, `vibrant-participant-home.png` |
| Schedule & RSVP | `schedule-rsvp.png`, `vibrant-schedule-rsvp.png` |
| Session Details | `session-details.png` |
| Pay Now Flow | `pay-now-v1.png` |
| Video Library (paywalled) | `video-library.png`, `tutorials-media.png` |
| Community Chat | `community-chat.png` |
| Upload Media | `upload-media.png` |
| Profile & Settings | `profile-settings.png` *(needs +1 fix and tab bar fix)* |
| Admin People Management | `admin-people-payments.png` |
| Admin Finance / P&L | `finance-pl-v2.png` |
| AI SMS Composer | `ai-sms-composer.png` |

**Known design inconsistencies to resolve before or during build:**
- Login and Profile screens show country code `+91` instead of `+1`
- Profile screen has a non-canonical tab bar (Home/Events/Passes/Profile) that doesn't match either the participant or admin tab bar
- Welcome screen copy says "Welcome to the Maandli" — should reference Rangtaal as the brand (Maandli is a Garba dance type, not the brand name)
- Finance numbers in mockups are placeholder values (~$482k profit) far higher than the real ~$1,800/month scale
- Several screens (cancel session flow, monthly opt-out admin flow, video player) are not yet designed and will need to be added during implementation

## 15. Next Steps

1. **User reviews this spec** and approves or requests changes
2. **Branding & UX phase** — Continue iterating on Stitch designs in parallel with implementation
3. **Implementation plan** — Use the writing-plans skill to break this spec into a step-by-step build plan
4. **Build v1** — Following the implementation plan, with iterative review checkpoints
