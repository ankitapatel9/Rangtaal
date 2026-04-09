# Capture & Upload — Design

> **Author:** brainstorming session 2026-04-09
> **Status:** approved by user, ready for implementation plan
> **Scope:** in-session photo/video capture with instant post to gallery

## Context

The session media gallery exists (Feature 3) but upload currently uses `expo-image-picker` (camera roll only). Users need to capture photos and videos live during Garba sessions — one-handed, fast, no friction — and have them post instantly to the session gallery.

## Goal

A floating action button (FAB) on the session detail screen opens the device camera. Tap for photo, hold for video. Media compresses on-device and uploads instantly to the session gallery — no review step, no caption prompt. The user returns to the session detail and sees their new media appear with an upload spinner.

## Design Decisions

- **Instant post** — no review screen. Capture → compress → upload → done.
- **FAB entry point** — gold camera button floating bottom-right on session detail screen.
- **"+ Add from roll"** — secondary entry point in gallery header for camera roll imports (existing flow).
- **Photo + Video** — toggle between modes. Tap shutter for photo, hold for video (or tap to start/stop in video mode).
- **Compression** — photos resized to 1080px max dimension. Videos compressed to 720p. Keeps uploads fast and storage manageable.
- **No duration cap** — videos over 5 minutes show a soft warning "Large video, upload may take a moment" but are not blocked.
- **Background upload** — user returns to session detail immediately. New tile shows spinner. Plum toast confirms completion.

## Non-goals

- No review/edit screen
- No captions on gallery media (future feature)
- No filters or effects
- No multi-select batch capture
- Not building a custom camera UI from scratch — use `expo-camera` for the camera view

## Architecture

### Camera Screen

New screen `app/camera.tsx` (or modal route):
- Full-screen camera preview via `expo-camera`
- Dark UI overlay with:
  - Close button (✕) top-left
  - Session tag pill top-right ("Apr 21 Session")
  - Photo/Video mode toggle at bottom
  - Shutter button: white circle, tap for photo, hold for video
  - Camera roll shortcut bottom-left (opens existing `expo-image-picker` flow)
  - Flip camera button bottom-right
- Video recording shows red recording indicator with elapsed time
- On capture: compress → upload in background → navigate back to session detail

### Compression

Use `expo-image-manipulator` for photo compression:
- Resize to max 1080px on longest side
- JPEG quality 0.8
- Produces a compressed URI for upload

For video compression, use `expo-video-thumbnails` for the thumbnail and upload the video as-is to Firebase Storage (React Native doesn't have a built-in video compressor). Video compression can be added later via a Cloud Function that transcodes on upload, or via `ffmpeg-kit-react-native` if needed.

### Upload Flow

1. Camera captures photo/video → gets local URI
2. For photos: compress via `expo-image-manipulator`
3. Upload to Firebase Storage at `sessions/{sessionId}/media/{timestamp}_{filename}`
4. Create `media` Firestore doc with download URL
5. Navigate back to session detail
6. Gallery shows new tile with spinner overlay while upload is in progress
7. Toast notification on completion: "Photo added to gallery" / "Video added to gallery"

### FAB Component

Create `src/components/CaptureButton.tsx`:
- 56px gold circle with Lucide Camera icon (white)
- Positioned `position: absolute, bottom: 24, right: 24`
- Shadow: `0 4px 16px rgba(201,150,60,0.4)`
- Tap navigates to camera screen with `sessionId` param

## Dependencies

- `expo-camera` — camera preview and capture (native dep, needs EAS Build)
- `expo-image-manipulator` — photo compression (no native dep)
- `expo-video-thumbnails` — generate video thumbnails (no native dep)

`expo-camera` is a native dependency — requires one EAS Build after installation.

## File-level changes

### Created
- `app/camera.tsx` — full-screen camera screen
- `src/components/CaptureButton.tsx` — FAB component

### Modified
- `app/session/[id].tsx` — add CaptureButton FAB, upload progress state, toast notification
- `app/_layout.tsx` — allow `/camera` route through auth gate (add `inCameraRoute` check)

### Untouched
- All existing media helpers (`createMedia`, `useMedia`, `deleteMedia`) — reused as-is
- Firebase Storage rules — already allow signed-in user writes
- Gallery display — already renders from `useMedia` hook

## Acceptance criteria

1. FAB visible on session detail screen (gold camera icon, bottom-right)
2. Tapping FAB opens full-screen camera with session tag
3. Photo mode: tap shutter → photo captured → returns to session → gallery shows new tile with spinner → toast on complete
4. Video mode: toggle to VIDEO → hold shutter → recording indicator with timer → release → returns → uploads
5. "+ Add from roll" in gallery header still works (existing camera roll flow)
6. Photos compressed to 1080px max before upload
7. Camera has flip button and camera roll shortcut
8. All existing tests pass
9. `npx tsc --noEmit` exits 0
