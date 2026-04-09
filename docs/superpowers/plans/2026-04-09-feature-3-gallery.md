# Feature 3: Session Media Gallery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Any signed-in user can upload photos and videos from a session; media displays in a gallery grid on the session detail screen.

**Architecture:** New `media` Firestore collection + Firebase Storage. `MediaDoc` type with future-proofed null fields (comments, tags, analysis). Upload via `expo-image-picker`, display in a grid, tap for full-screen view, `expo-av` for video playback. No paywall.

**Tech Stack:** TypeScript · @react-native-firebase/firestore · Firebase Storage · expo-av · expo-image-picker · Jest · RNTL

**Reference spec:** `docs/superpowers/specs/2026-04-09-phase-3-payments-videos-notifications-design.md` § Feature 3

---

### Task 1: Define MediaDoc type

**Files:**
- Create: `src/types/media.ts`

- [ ] **Step 1: Create the type**

```ts
export interface MediaDoc {
  id: string;
  sessionId: string;
  type: "photo" | "video";
  storageUrl: string;
  uploadedBy: string;
  uploadedAt: number;
  // Future fields — stored as null now
  comments: null;
  tags: null;
  analysis: null;
}
```

- [ ] **Step 2: TypeScript clean**: `npx tsc --noEmit`
- [ ] **Step 3: Commit**: `git add src/types/media.ts && git commit -m "feat: define MediaDoc type"`

---

### Task 2: TDD media Firestore helpers

**Files:**
- Create: `__tests__/lib/media.test.ts`, `src/lib/media.ts`

- [ ] **Step 1: Write failing tests**

Tests for:
- `getMediaForSession(sessionId)` — queries `media` where `sessionId == id`, ordered by `uploadedAt desc`. Returns `MediaDoc[]`.
- `createMedia(input)` — calls `firestore().collection("media").add(...)` with serverTimestamp for `uploadedAt` and null for future fields.
- `deleteMedia(mediaId)` — calls `firestore().collection("media").doc(id).delete()`.

- [ ] **Step 2: Run, confirm failure**
- [ ] **Step 3: Implement `src/lib/media.ts`**

```ts
import firestore from "@react-native-firebase/firestore";
import { MediaDoc } from "../types/media";

export async function getMediaForSession(sessionId: string): Promise<MediaDoc[]> {
  const snap = await firestore()
    .collection("media")
    .where("sessionId", "==", sessionId)
    .orderBy("uploadedAt", "desc")
    .get();
  return snap.docs.map((doc) => ({ ...(doc.data() as Omit<MediaDoc, "id">), id: doc.id }));
}

export interface CreateMediaInput {
  sessionId: string;
  type: "photo" | "video";
  storageUrl: string;
  uploadedBy: string;
}

export async function createMedia(input: CreateMediaInput): Promise<string> {
  const ref = await firestore().collection("media").add({
    ...input,
    uploadedAt: firestore.FieldValue.serverTimestamp(),
    comments: null,
    tags: null,
    analysis: null,
  });
  return ref.id;
}

export async function deleteMedia(mediaId: string): Promise<void> {
  await firestore().collection("media").doc(mediaId).delete();
}
```

- [ ] **Step 4: Run, confirm pass**
- [ ] **Step 5: Commit**: `git add __tests__/lib/media.test.ts src/lib/media.ts && git commit -m "feat: media Firestore helpers"`

---

### Task 3: TDD `useMedia` hook

**Files:**
- Create: `__tests__/hooks/useMedia.test.tsx`, `src/hooks/useMedia.ts`

- [ ] **Step 1: Write failing test**

Test `useMedia(sessionId)`:
- Subscribes via `onSnapshot` on `media` collection filtered by `sessionId`, ordered by `uploadedAt desc`
- Returns `{ media: MediaDoc[], loading: boolean }`
- Returns empty + not loading when sessionId is undefined

- [ ] **Step 2: Implement**

```ts
import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { MediaDoc } from "../types/media";

export interface UseMediaState {
  media: MediaDoc[];
  loading: boolean;
}

export function useMedia(sessionId: string | undefined): UseMediaState {
  const [state, setState] = useState<UseMediaState>({
    media: [],
    loading: !!sessionId,
  });

  useEffect(() => {
    if (!sessionId) {
      setState({ media: [], loading: false });
      return;
    }
    const unsub = firestore()
      .collection("media")
      .where("sessionId", "==", sessionId)
      .orderBy("uploadedAt", "desc")
      .onSnapshot(
        (snap) => {
          if (!snap) return;
          const media = snap.docs.map((d) => ({
            ...(d.data() as Omit<MediaDoc, "id">),
            id: d.id,
          }));
          setState({ media, loading: false });
        },
        (err) => {
          console.error("useMedia error:", err);
          setState({ media: [], loading: false });
        }
      );
    return unsub;
  }, [sessionId]);

  return state;
}
```

- [ ] **Step 3: Run, confirm pass**
- [ ] **Step 4: Commit**: `git add __tests__/hooks/useMedia.test.tsx src/hooks/useMedia.ts && git commit -m "feat: useMedia hook"`

---

### Task 4: Firestore rules + index for media

**Files:**
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`

- [ ] **Step 1: Add media rule**

```
    match /media/{mediaId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow delete: if isAdmin() ||
        (isSignedIn() && resource.data.uploadedBy == request.auth.uid);
      allow update: if isAdmin();
    }
```

- [ ] **Step 2: Add composite index**

```json
{
  "collectionGroup": "media",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "sessionId", "order": "ASCENDING" },
    { "fieldPath": "uploadedAt", "order": "DESCENDING" }
  ]
}
```

- [ ] **Step 3: Deploy**: `firebase deploy --only firestore:rules,firestore:indexes`
- [ ] **Step 4: Commit**

```bash
git add firestore.rules firestore.indexes.json
git commit -m "feat: Firestore rules and index for media collection"
```

---

### Task 5: Gallery section on session detail

**Files:**
- Modify: `app/session/[id].tsx`

- [ ] **Step 1: Add gallery section**

After the tutorials section (or admin box), add:
- Import `useMedia`, `Image` from RN, `Video` from `expo-av`, image picker
- A "Gallery" header with media count
- Grid of thumbnails (3 columns): photos show as `Image`, videos show with a play icon overlay
- Tap photo → full-screen modal with the image
- Tap video → plays inline via `expo-av`
- "Add Photo/Video" button for any signed-in user:
  1. Opens `expo-image-picker` (allow photos + videos)
  2. Uploads to Firebase Storage at `sessions/{sessionId}/media/{mediaId}/{filename}`
  3. Creates a `media` Firestore doc
  4. Shows upload progress
- Uploader sees a delete button on their own media; admins see delete on all

- [ ] **Step 2: TypeScript clean + tests pass**
- [ ] **Step 3: Commit**

```bash
git add app/session/[id].tsx
git commit -m "feat: session media gallery with upload and full-screen view"
```
