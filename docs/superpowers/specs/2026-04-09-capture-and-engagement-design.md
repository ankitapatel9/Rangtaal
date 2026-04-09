# Capture & Social Engagement — Design

> **Author:** brainstorming session 2026-04-09
> **Status:** approved by user, ready for implementation plan
> **Scope:** in-session photo/video capture + likes/comments/replies on gallery media and tutorials

## Context

The session media gallery and tutorial videos exist but lack two things: (1) a fast capture flow for taking photos/videos during Garba sessions, and (2) social engagement (likes, comments, replies) on that content. This spec adds both.

## Brand Palette

Plum & Gold only. All UI uses theme tokens from `src/theme/`. No hardcoded colors.

- Primary: `#2D1B3D` · Accent: `#C9963C` · Page bg: `#FAF7F2` · Cards: `#FFFFFF`
- Body: `#5A4B6B` · Secondary: `#9CA3AF` · Borders: `#E8E2D9` · Destructive: `#DC2626`
- Full-screen media viewer: `#0F0F0F` background (standard photo viewer dark)

---

## Feature 1: Capture Flow

### Entry Points

1. **FAB (Floating Action Button)** — gold camera button (56px circle), bottom-right of session detail screen. Tap opens camera.
2. **"+ Add from roll"** — link in gallery section header. Opens `expo-image-picker` for camera roll selection (existing flow, unchanged).

### Camera Screen (`app/camera.tsx`)

Full-screen camera via `expo-camera`:
- Dark overlay UI
- Close button (✕) top-left
- Session tag pill top-right (e.g., "Apr 21 Session")
- **Photo/Video mode toggle** at bottom — "PHOTO" (gold when active) / "VIDEO"
- **Shutter button** — white circle. Tap for photo in photo mode. Tap to start/stop recording in video mode.
- **Recording indicator** — red pill with white dot + elapsed time, shown during video recording
- **Camera roll shortcut** — bottom-left, opens existing image picker flow
- **Flip camera** — bottom-right, toggles front/back

### Instant Post Flow

1. User taps FAB → camera opens with `sessionId` param
2. User captures photo or video
3. Photo: compress via `expo-image-manipulator` (1080px max, JPEG 0.8)
4. Upload to Firebase Storage: `sessions/{sessionId}/media/{timestamp}_{filename}`
5. Create `media` Firestore doc via existing `createMedia()`
6. Navigate back to session detail immediately
7. New gallery tile shows upload spinner overlay
8. Plum toast on completion: "Photo added to gallery" / "Video added to gallery"

No review step. No caption. Instant.

### Dependencies

- `expo-camera` — native dep, needs EAS Build
- `expo-image-manipulator` — no native dep

### Files

- Create: `app/camera.tsx`
- Create: `src/components/CaptureButton.tsx` — the FAB
- Modify: `app/session/[id].tsx` — add CaptureButton, upload progress state, toast
- Modify: `app/_layout.tsx` — add `camera` to auth gate whitelist

---

## Feature 2: Social Engagement

### Data Model

New Firestore collections:

**`likes`** collection:
```ts
interface LikeDoc {
  id: string;
  parentId: string;       // mediaId or tutorialId or commentId
  parentType: "media" | "tutorial" | "comment";
  userId: string;
  createdAt: number;
}
```

**`comments`** collection:
```ts
interface CommentDoc {
  id: string;
  parentId: string;       // mediaId or tutorialId
  parentType: "media" | "tutorial";
  replyToId: string | null;  // null = top-level, commentId = reply
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
}
```

### Like Behavior

- Tap heart icon to toggle like on/off
- Liked state: filled heart in gold
- Unliked state: outline heart in plum (gallery dark view: white)
- Like count shown next to icon
- One like per user per item (enforced by Firestore rules: `likes` doc ID = `{parentId}_{userId}`)
- Liking a comment: small ♡ with count inline

### Comment Behavior

- Comments are threaded: top-level comments under a media/tutorial, replies under a comment
- **One level of replies only** — no nested threads. Reply to a reply posts as a sibling reply to the same parent comment.
- Each comment shows: avatar + name (bold) + text + timestamp + "Reply" link (gold) + like count
- Replies: indented under parent, smaller avatars (20px vs 28px)
- Comment input: rounded pill at bottom with gold send button
- When replying: input shows "Replying to {name}" above the text field

### Where Engagement Appears

**Gallery media (full-screen view):**
- Dark background (`#0F0F0F`)
- Engagement bar below the photo/video: like button + count, comment button + count
- Uploader info: avatar + name + session date
- Comments section scrollable below
- Comment input fixed at bottom

**Tutorial video (detail view):**
- Warm ivory background
- Engagement row below video player: like + count, comment + count
- "Comments" section header
- Threaded comments below
- Comment input at bottom

**Session detail (inline previews):**
- Gallery thumbnails show small heart + count overlay on bottom-left
- Tutorial cards show like + comment counts in the meta line

### Firestore Rules

```
match /likes/{likeId} {
  allow read: if isSignedIn();
  allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
  allow delete: if isSignedIn() && resource.data.userId == request.auth.uid;
  allow update: if false;
}

match /comments/{commentId} {
  allow read: if isSignedIn();
  allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
  allow delete: if isSignedIn() && resource.data.userId == request.auth.uid;
  allow update: if false;
}
```

Like doc ID convention: `{parentId}_{userId}` — ensures one like per user per item via Firestore's document ID uniqueness.

### Firestore Indexes

- `likes`: (parentId ASC, parentType ASC) — for counting likes on an item
- `comments`: (parentId ASC, createdAt ASC) — for loading comments in order

### Lib Helpers (TDD)

`src/lib/likes.ts`:
- `toggleLike(parentId, parentType, userId)` — checks if like doc exists, creates or deletes
- `getLikeCount(parentId)` — queries likes by parentId, returns count
- `isLikedByUser(parentId, userId)` — checks if specific like doc exists

`src/lib/comments.ts`:
- `addComment(input: { parentId, parentType, replyToId, userId, userName, text })` — creates comment doc
- `getComments(parentId)` — queries comments by parentId ordered by createdAt
- `deleteComment(commentId)` — deletes comment doc

### Hooks

`src/hooks/useLikes.ts`:
- `useLikes(parentId)` — onSnapshot, returns `{ count, isLiked, toggle() }`
- Needs `userId` from auth context

`src/hooks/useComments.ts`:
- `useComments(parentId)` — onSnapshot on comments for this parent, returns `{ comments: CommentDoc[], loading }`
- Organizes into threads: top-level comments with their replies nested

### Components

`src/components/LikeButton.tsx`:
- Heart icon (Lucide Heart), filled gold when liked, outline when not
- Count next to it
- Haptic feedback on tap

`src/components/CommentThread.tsx`:
- Renders a top-level comment + its replies
- Avatar + name + text + timestamp + Reply link + like count
- Replies indented with smaller avatars

`src/components/CommentInput.tsx`:
- Rounded pill input + gold send button
- "Replying to {name}" indicator when in reply mode
- Clears after send

`src/components/EngagementBar.tsx`:
- Horizontal row: LikeButton + comment count button
- Used in both gallery and tutorial views

### Files

**Created:**
- `src/types/like.ts`, `src/types/comment.ts`
- `src/lib/likes.ts`, `src/lib/comments.ts`
- `src/hooks/useLikes.ts`, `src/hooks/useComments.ts`
- `src/components/LikeButton.tsx`, `src/components/CommentThread.tsx`, `src/components/CommentInput.tsx`, `src/components/EngagementBar.tsx`
- `__tests__/lib/likes.test.ts`, `__tests__/lib/comments.test.ts`
- `__tests__/hooks/useLikes.test.tsx`, `__tests__/hooks/useComments.test.tsx`

**Modified:**
- `app/session/[id].tsx` — add like counts on gallery thumbnails and tutorial cards
- Gallery full-screen modal — add engagement bar + comments
- Tutorial detail — add engagement bar + comments
- `firestore.rules` — likes + comments rules
- `firestore.indexes.json` — likes + comments indexes

---

## Acceptance Criteria

### Capture
1. FAB visible on session detail (gold camera icon, bottom-right)
2. Tapping FAB opens full-screen camera with session tag
3. Photo mode: tap shutter → instant upload → gallery shows spinner → toast
4. Video mode: tap to start recording → recording indicator → tap to stop → upload → toast
5. Camera has flip, camera roll shortcut, photo/video toggle
6. Photos compressed to 1080px before upload

### Engagement
7. Gallery full-screen view has like button + comment section
8. Tutorial detail has like button + comment section
9. Tapping heart toggles like — filled gold when liked, outline when not
10. Like count updates in real-time
11. Comments appear chronologically with avatar, name, text, timestamp
12. Reply link opens reply mode — reply appears indented under parent
13. Only one level of replies (no nested threads)
14. Users can delete their own comments
15. Like on individual comments works (small ♡ with count)
16. Session detail shows like counts on gallery thumbnails and tutorial meta

### Quality
17. All new helpers have TDD tests
18. All existing tests still pass
19. `npx tsc --noEmit` exits 0
20. Plum & Gold palette only — no off-brand colors
