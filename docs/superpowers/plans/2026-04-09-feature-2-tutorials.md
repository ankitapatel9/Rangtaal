# Feature 2: Tutorial Videos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins upload per-session tutorial videos; paid users watch them, unpaid see a paywall lock.

**Architecture:** New `tutorials` Firestore collection + Firebase Storage. `TutorialDoc` type, CRUD helpers, `useTutorials` hook, upload flow on session detail, Videos tab shows all tutorials chronologically, `expo-av` for playback, paywall checks `userDoc.paid`.

**Tech Stack:** TypeScript · @react-native-firebase/firestore · Firebase Storage · expo-av · expo-image-picker · Jest · RNTL

**Depends on:** Feature 1 (Payment Flag) — needs `paid` field on `UserDoc`

**Reference spec:** `docs/superpowers/specs/2026-04-09-phase-3-payments-videos-notifications-design.md` § Feature 2

---

### Task 1: Define TutorialDoc type

**Files:**
- Create: `src/types/tutorial.ts`

- [ ] **Step 1: Create the type**

```ts
export interface TutorialDoc {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  createdAt: number;
  createdBy: string;
  order: number;
}
```

- [ ] **Step 2: TypeScript clean**: `npx tsc --noEmit`
- [ ] **Step 3: Commit**: `git add src/types/tutorial.ts && git commit -m "feat: define TutorialDoc type"`

---

### Task 2: TDD tutorial Firestore helpers

**Files:**
- Create: `__tests__/lib/tutorials.test.ts`, `src/lib/tutorials.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/tutorials.test.ts` with tests for:
- `getTutorialsForSession(sessionId)` — queries `tutorials` where `sessionId == id`, ordered by `order asc`. Returns `TutorialDoc[]`.
- `createTutorial(input)` — calls `firestore().collection("tutorials").add(...)` with the input fields + serverTimestamp for `createdAt`.
- `deleteTutorial(tutorialId)` — calls `firestore().collection("tutorials").doc(id).delete()`.

Mock pattern: same as existing tests (mock `firestore` return value with chained methods).

- [ ] **Step 2: Run, confirm failure**
- [ ] **Step 3: Implement `src/lib/tutorials.ts`**

```ts
import firestore from "@react-native-firebase/firestore";
import { TutorialDoc } from "../types/tutorial";

export async function getTutorialsForSession(sessionId: string): Promise<TutorialDoc[]> {
  const snap = await firestore()
    .collection("tutorials")
    .where("sessionId", "==", sessionId)
    .orderBy("order", "asc")
    .get();
  return snap.docs.map((doc) => ({ ...(doc.data() as Omit<TutorialDoc, "id">), id: doc.id }));
}

export interface CreateTutorialInput {
  sessionId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  createdBy: string;
  order: number;
}

export async function createTutorial(input: CreateTutorialInput): Promise<string> {
  const ref = await firestore().collection("tutorials").add({
    ...input,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function deleteTutorial(tutorialId: string): Promise<void> {
  await firestore().collection("tutorials").doc(tutorialId).delete();
}
```

- [ ] **Step 4: Run, confirm pass**
- [ ] **Step 5: Commit**: `git add __tests__/lib/tutorials.test.ts src/lib/tutorials.ts && git commit -m "feat: tutorial Firestore helpers"`

---

### Task 3: TDD `useTutorials` hook

**Files:**
- Create: `__tests__/hooks/useTutorials.test.tsx`, `src/hooks/useTutorials.ts`

- [ ] **Step 1: Write failing test**

Test `useTutorials(sessionId)`:
- Subscribes via `onSnapshot` on `tutorials` collection filtered by `sessionId`, ordered by `order asc`
- Returns `{ tutorials: TutorialDoc[], loading: boolean }`
- Returns empty list + `loading: false` when `sessionId` is undefined

Same onSnapshot mock pattern as `useSessions`.

- [ ] **Step 2: Run, confirm failure**
- [ ] **Step 3: Implement**

```ts
import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { TutorialDoc } from "../types/tutorial";

export interface UseTutorialsState {
  tutorials: TutorialDoc[];
  loading: boolean;
}

export function useTutorials(sessionId: string | undefined): UseTutorialsState {
  const [state, setState] = useState<UseTutorialsState>({
    tutorials: [],
    loading: !!sessionId,
  });

  useEffect(() => {
    if (!sessionId) {
      setState({ tutorials: [], loading: false });
      return;
    }
    const unsub = firestore()
      .collection("tutorials")
      .where("sessionId", "==", sessionId)
      .orderBy("order", "asc")
      .onSnapshot(
        (snap) => {
          if (!snap) return;
          const tutorials = snap.docs.map((d) => ({
            ...(d.data() as Omit<TutorialDoc, "id">),
            id: d.id,
          }));
          setState({ tutorials, loading: false });
        },
        (err) => {
          console.error("useTutorials error:", err);
          setState({ tutorials: [], loading: false });
        }
      );
    return unsub;
  }, [sessionId]);

  return state;
}
```

- [ ] **Step 4: Run, confirm pass**
- [ ] **Step 5: Commit**: `git add __tests__/hooks/useTutorials.test.tsx src/hooks/useTutorials.ts && git commit -m "feat: useTutorials hook"`

---

### Task 4: Add tutorials Firestore rules + deploy index

**Files:**
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`

- [ ] **Step 1: Add tutorials rule to `firestore.rules`**

Add before the closing `}` of `match /databases/{database}/documents`:
```
    match /tutorials/{tutorialId} {
      allow read: if isSignedIn();
      allow create, update, delete: if isAdmin();
    }
```

- [ ] **Step 2: Add composite index to `firestore.indexes.json`**

Add to the `indexes` array:
```json
{
  "collectionGroup": "tutorials",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "sessionId", "order": "ASCENDING" },
    { "fieldPath": "order", "order": "ASCENDING" }
  ]
}
```

- [ ] **Step 3: Deploy**

Run: `firebase deploy --only firestore:rules,firestore:indexes`

- [ ] **Step 4: Commit**

```bash
git add firestore.rules firestore.indexes.json
git commit -m "feat: Firestore rules and index for tutorials collection"
```

---

### Task 5: Session detail — tutorials section + upload

**Files:**
- Modify: `app/session/[id].tsx`

- [ ] **Step 1: Add tutorials section to session detail**

After the RSVP count section in the session detail screen, add:
- Import `useTutorials` hook, `Video` from `expo-av`, image picker
- A "Tutorials" header
- List of tutorial cards: thumbnail (or play icon), title, description
- If `userDoc.paid` — tap plays the video inline via `expo-av` `Video` component
- If `!userDoc.paid` — tap shows Alert: "Contact admin to unlock tutorial videos"
- If `isAdmin` — show "Upload Tutorial" button that:
  1. Opens image picker (`expo-image-picker`) for video selection
  2. Prompts for title via `Alert.prompt` or a simple text input
  3. Uploads to Firebase Storage at `tutorials/{tutorialId}/{filename}`
  4. Creates a `tutorials` Firestore doc with the download URL
  5. Shows upload progress indicator

- [ ] **Step 2: TypeScript clean + tests pass**

Run: `npx tsc --noEmit && npm test`

- [ ] **Step 3: Commit**

```bash
git add app/session/[id].tsx
git commit -m "feat: tutorials section on session detail with paywall and admin upload"
```

---

### Task 6: Participant Videos tab — all tutorials chronologically

**Files:**
- Modify: `app/(participant)/videos.tsx`

- [ ] **Step 1: Replace placeholder**

Replace the entire file with a screen that:
- Uses `useActiveClass` to get the class
- Uses `useSessions` to get all sessions
- For each session, uses a `TutorialList` component that loads tutorials via `useTutorials(session.id)`
- Groups tutorials by session date: "Tuesday, April 21" header, then tutorial cards below
- Same paywall logic as session detail: paid users tap to play, unpaid see lock
- Empty state: "No tutorials yet"

Note: loading all tutorials per session is N+1 queries. For MVP with ~24 sessions this is acceptable. Optimize later if needed.

- [ ] **Step 2: TypeScript clean + tests pass**
- [ ] **Step 3: Commit**

```bash
git add app/(participant)/videos.tsx
git commit -m "feat: Videos tab shows all tutorials grouped by session date"
```
