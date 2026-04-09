# Feature 4: Push Notifications + SMS Fallback — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automated push reminders (day-before evening + day-of 2hrs before) for sessions via FCM/APNs, with SMS fallback via Twilio for users without push tokens. Cancellation notifications sent immediately when admin cancels a session.

**Architecture:** `@react-native-firebase/messaging` for FCM token registration on the client. Firebase Cloud Functions (TypeScript) in a `functions/` directory: a scheduled function for reminders, a Firestore trigger for cancellation notifications, a Twilio helper for SMS. `fcmToken` field added to `UserDoc`.

**Tech Stack:** TypeScript · @react-native-firebase/messaging · Firebase Cloud Functions · Twilio Node SDK · Jest

**Note:** This feature adds a native dependency — requires one EAS Build after installation.

**Reference spec:** `docs/superpowers/specs/2026-04-09-phase-3-payments-videos-notifications-design.md` § Feature 4

---

### Task 1: Add `fcmToken` to UserDoc + client registration hook

**Files:**
- Modify: `src/types/user.ts` — add `fcmToken: string | null`
- Create: `src/hooks/useNotifications.ts`

- [ ] **Step 1: Update UserDoc**

Add `fcmToken: string | null` to the `UserDoc` interface.

- [ ] **Step 2: Create `src/hooks/useNotifications.ts`**

```ts
import { useEffect } from "react";
import messaging from "@react-native-firebase/messaging";
import firestore from "@react-native-firebase/firestore";

export function useNotifications(uid: string | undefined): void {
  useEffect(() => {
    if (!uid) return;

    async function register() {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) return;

      const token = await messaging().getToken();
      if (token) {
        await firestore().collection("users").doc(uid).update({ fcmToken: token });
      }
    }

    register();

    const unsubRefresh = messaging().onTokenRefresh(async (newToken) => {
      await firestore().collection("users").doc(uid!).update({ fcmToken: newToken });
    });

    return unsubRefresh;
  }, [uid]);
}
```

- [ ] **Step 3: Mount in `app/_layout.tsx`**

Add after the existing hooks at the top of `RootLayout`:
```ts
import { useNotifications } from "../src/hooks/useNotifications";
// ... inside RootLayout:
useNotifications(authUser?.uid);
```

- [ ] **Step 4: Update Firestore rules**

Users should be able to update their own `fcmToken`. The existing self-update rule already allows updates when `role` and `paid` are unchanged. `fcmToken` is unrestricted for self-updates — this already works under the current rule structure.

- [ ] **Step 5: Install `@react-native-firebase/messaging`**

Run: `npm install @react-native-firebase/messaging`

Note: This is a native dependency. A new EAS Build is needed before this works on the device. The Cloud Functions (Tasks 2-4) can be built and deployed independently.

- [ ] **Step 6: Commit**

```bash
git add src/types/user.ts src/hooks/useNotifications.ts app/_layout.tsx package.json package-lock.json
git commit -m "feat: FCM token registration hook + messaging dependency"
```

---

### Task 2: Initialize Cloud Functions project

**Files:**
- Create: `functions/` directory with TypeScript project

- [ ] **Step 1: Initialize the functions directory**

```bash
mkdir -p functions/src/__tests__
cd functions
npm init -y
npm install firebase-admin firebase-functions twilio
npm install -D typescript jest ts-jest @types/jest
```

- [ ] **Step 2: Create `functions/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./lib",
    "rootDir": "./src",
    "sourceMap": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `functions/jest.config.js`**

```js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
};
```

- [ ] **Step 4: Create `functions/src/index.ts`**

```ts
export { sendSessionReminders } from "./reminders";
export { onSessionCancelled } from "./cancellation";
```

- [ ] **Step 5: Add `functions` to root `.gitignore`**

Append:
```
# Cloud Functions build output
functions/lib/
```

- [ ] **Step 6: Commit**

```bash
git add functions/ .gitignore
git commit -m "chore: initialize Cloud Functions TypeScript project"
```

---

### Task 3: TDD scheduled reminder function

**Files:**
- Create: `functions/src/reminders.ts`, `functions/src/sms.ts`, `functions/src/__tests__/reminders.test.ts`

- [ ] **Step 1: Write failing test**

Create `functions/src/__tests__/reminders.test.ts` that:
- Mocks `firebase-admin` Firestore (get sessions for tomorrow/today, get users, update reminderSent flags)
- Mocks FCM `admin.messaging().send()`
- Mocks Twilio client `messages.create()`
- Tests: given a session tomorrow with 2 RSVP'd users (one with fcmToken, one without) and 1 non-RSVP'd user:
  - User with token → FCM push sent with confirmation message
  - User without token → SMS sent with confirmation message
  - Non-RSVP'd user with token → FCM push sent with nudge message
  - `reminderSent.dayBefore` updated to `true`

- [ ] **Step 2: Implement `functions/src/sms.ts`**

```ts
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSms(to: string, body: string): Promise<void> {
  await client.messages.create({
    to,
    from: process.env.TWILIO_FROM_NUMBER!,
    body,
  });
}
```

- [ ] **Step 3: Implement `functions/src/reminders.ts`**

A Firebase scheduled function (`onSchedule`) that:
1. Queries `sessions` for tomorrow's sessions (dayBefore) or today's sessions (dayOf) where `status === "upcoming"` and the relevant `reminderSent` flag is `false`
2. For each session, gets all users in the class
3. Splits users into RSVP'd / non-RSVP'd
4. For each user: if `fcmToken` → send FCM, else → send SMS via Twilio
5. Updates `reminderSent.dayBefore` or `reminderSent.dayOf` to `true`

Export as two scheduled functions:
- `sendDayBeforeReminders` — runs daily at 7:00 PM CT (`0 19 * * *` in America/Chicago)
- `sendDayOfReminders` — runs daily at 5:30 PM CT (`30 17 * * *` in America/Chicago)

- [ ] **Step 4: Run tests, confirm pass**

Run: `cd functions && npm test`

- [ ] **Step 5: Commit**

```bash
git add functions/src/
git commit -m "feat: scheduled session reminder Cloud Functions with SMS fallback"
```

---

### Task 4: TDD cancellation notification function

**Files:**
- Create: `functions/src/cancellation.ts`, `functions/src/__tests__/cancellation.test.ts`

- [ ] **Step 1: Write failing test**

Test that when a session's `status` changes from `"upcoming"` to `"cancelled"`:
- All RSVP'd users receive a push or SMS with the cancellation reason
- Non-RSVP'd users are not notified

- [ ] **Step 2: Implement `functions/src/cancellation.ts`**

A Firestore `onDocumentUpdated` trigger on `sessions/{sessionId}`:
1. Check if `status` changed from `"upcoming"` to `"cancelled"`
2. If not, return early
3. Get all RSVP'd users (from `before.rsvps` array)
4. For each: push if `fcmToken`, SMS if not
5. Message: "Tonight's Garba session has been cancelled: {cancellationReason}"

- [ ] **Step 3: Run tests, confirm pass**
- [ ] **Step 4: Commit**

```bash
git add functions/src/
git commit -m "feat: cancellation notification Cloud Function"
```

---

### Task 5: Admin cancel session flow

**Files:**
- Modify: `app/session/[id].tsx`

- [ ] **Step 1: Replace the admin stub box with a real cancel button**

In the session detail screen, replace the "Cancel and custom-message flows arrive in Phase 4" stub with:
- A "Cancel Session" button (red)
- Tap → `Alert.prompt` asking for cancellation reason
- On confirm → update session doc: `status: "cancelled"`, `cancellationReason: reason`, `cancelledAt: serverTimestamp()`, `cancelledBy: authUser.uid`
- The Firestore trigger in Task 4 automatically sends notifications

- [ ] **Step 2: Add `cancelSession` helper to `src/lib/sessions.ts`**

```ts
export async function cancelSession(
  sessionId: string,
  reason: string,
  adminUid: string
): Promise<void> {
  await firestore().collection("sessions").doc(sessionId).update({
    status: "cancelled",
    cancellationReason: reason,
    cancelledAt: firestore.FieldValue.serverTimestamp(),
    cancelledBy: adminUid,
  });
}
```

- [ ] **Step 3: TypeScript clean + tests pass**
- [ ] **Step 4: Commit**

```bash
git add app/session/[id].tsx src/lib/sessions.ts
git commit -m "feat: admin cancel session flow triggers cancellation notification"
```

---

### Task 6: Deploy Cloud Functions

**Files:** None (deploy only)

- [ ] **Step 1: Build**

```bash
cd functions && npx tsc && cd ..
```

- [ ] **Step 2: Set Twilio config**

```bash
firebase functions:config:set twilio.account_sid="YOUR_SID" twilio.auth_token="YOUR_TOKEN" twilio.from_number="+1XXXXXXXXXX"
```

(Interactive — user provides Twilio credentials)

- [ ] **Step 3: Deploy**

```bash
firebase deploy --only functions
```

- [ ] **Step 4: Verify in Firebase Console**

Check Functions tab shows `sendDayBeforeReminders`, `sendDayOfReminders`, `onSessionCancelled`.

- [ ] **Step 5: Commit any remaining changes**

```bash
git add -A && git commit -m "chore: deploy Cloud Functions for notifications"
```
