# UI Redesign Wave 1 — Design

> **Author:** brainstorming session 2026-04-09
> **Status:** approved by user, ready for implementation plan
> **Scope:** 3 screens (Home, Schedule, Session Detail) + design system foundation

## Context

The current Rangtaal UI uses placeholder screens with basic FlatLists, Alert.prompt for forms, and a dated pink-on-purple color scheme. The user wants a modern, clean, native-feeling experience inspired by ClassPass (elevated cards, generous spacing, premium feel) and Strava (bold stats, social activity feed). The app serves a multi-generational Garba community — it needs to be welcoming but polished.

## Design Direction

**Elevated Clean** — ClassPass-inspired white floating cards, generous spacing, subtle shadows, premium feel. No dark mode for MVP.

## Brand Palette: Plum & Gold

Two brand colors only. Maximum restraint.

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Deep Plum | `#2D1B3D` | Headers, headings, text, hero backgrounds |
| Accent | Saffron Gold | `#C9963C` | CTAs, buttons, links, highlights, selected states |
| Page background | Warm Ivory | `#FAF7F2` | All screen backgrounds |
| Cards | White | `#FFFFFF` | Floating cards |
| Body text | Muted Plum | `#5A4B6B` | Secondary text, descriptions |
| Secondary | Gray | `#9CA3AF` | Timestamps, meta text, placeholders |
| Borders | Warm Gray | `#E8E2D9` | Card borders, dividers, inactive toggle |
| Destructive | Red | `#DC2626` | Cancel session, delete, errors only |

**Rules:**
- No vermillion, no orange, no green — two brand colors plus neutrals
- Gold border (not green) for confirmed/success states (RSVP'd, Paid)
- Red appears only for destructive actions
- Hero backgrounds use plum gradient: `linear-gradient(135deg, #2D1B3D, #3D2B4D)`

## Non-goals

- **Not** redesigning login/OTP/welcome screens (Wave 3)
- **Not** redesigning Me/Profile or Community tabs (Wave 2)
- **Not** adding dark mode
- **Not** building the social sharing feature (Instagram/FB import — future phase)
- **Not** changing any data models, hooks, or lib functions — this is purely visual

## Screen 1: Home — Activity Feed

The home screen is a social activity feed showing what's happening in the community, with the next session pinned at top.

### Layout (top to bottom)

1. **Header bar** — "Rangtaal" wordmark (left), user avatar circle with initials (right)

2. **Payment due banner** (conditional) — warm yellow background (`#FFF8EB`) with gold border, shows only when payment is due or overdue. Dismissable with ✕ button. Text: "Payment due {date}" + "$60 · Contact admin". Does not appear when paid.

3. **Next Session hero card** — plum gradient background, pinned at top of feed:
   - "NEXT TUESDAY" label in gold, uppercase, tracked
   - Date + time in white, bold
   - Location in white, muted
   - Large RSVP count on the right: big number in gold + "Going" label below
   - Full-width gold RSVP button at bottom of card
   - Tapping the card (not the button) navigates to session detail

4. **Activity feed** — "RECENT" section label, then chronological feed items:
   - **Tutorial posted** — author avatar + "Name posted a tutorial" + timestamp. Video thumbnail with play button overlay and duration badge. Title + session date below.
   - **Photos added** — author avatar + "Name added photos" + timestamp. 2×2 grid preview with "+N" on last tile if more. Session date below.
   - **Chat message** — author avatar + "Name in chat" + timestamp. Message preview text. "N replies →" link in gold.
   - Feed is pull-to-refresh, chronological, loads on scroll

5. **Bottom tab bar** — existing Expo Router tabs, unchanged

### What's NOT in the feed
- Individual RSVP notifications (count is on the session card)
- Payment status (only shows as banner when due)
- Stats, progress bars, streaks (removed — too dashboard-y)

## Screen 2: Schedule — Calendar + List Toggle

Dual-view schedule with an iOS-native segmented control toggle.

### Toggle
- Pill-shaped segmented control at top: "Calendar" | "List"
- Active segment: white background with subtle shadow
- Inactive: transparent on warm gray pill
- User's preference persists across visits (stored in AsyncStorage)

### Calendar View
- Month navigation: ‹ April 2026 › with arrows
- 7-column day grid (S M T W T F S)
- Session Tuesdays: plum circle with white date number
- Selected/current session: gold circle
- Non-session dates: gray text, no circle
- Legend below grid: gold dot = Selected, plum dot = Session
- **Selected session preview card** below the calendar: white card with gold left border, shows date, time, location, avatar stack, RSVP count, chevron to navigate to detail
- Swipe left/right to change months

### List View
- Grouped by "UPCOMING" and "PAST" section labels (gold and gray uppercase)
- White card rows: date (bold), meta line ("N going · N tutorials")
- This week's session: gold left border accent
- Past sessions: reduced opacity
- Cancelled sessions: strikethrough date, red "Cancelled" label, dimmed
- Tap any row → session detail

## Screen 3: Session Detail

The hero screen. ScrollView with distinct sections.

### Section 1: Header
- Plum gradient background (same as home card)
- "UPCOMING SESSION" label in gold
- Date: large, bold, white (e.g., "Tuesday, April 21")
- Time: "7:30 – 9:30 PM" in white, muted
- Location icon + name + address in white

### Section 2: RSVP
- White card with subtle shadow
- Avatar stack of attendees + "N going" count
- **Not RSVP'd state:** gold RSVP button, full-width
- **RSVP'd state:** white card with gold left border, green checkmark circle, "You're in!" text, "Tap to cancel your RSVP" subtitle
- **Cancelled state:** red banner (`#FEE2E2` bg, `#DC2626` text): "This session was cancelled" + reason

### Section 3: Admin Controls (admin only, non-cancelled)
- "Cancel Session" button in red
- Tap → bottom sheet (not Alert.prompt) with text input for cancellation reason + "Cancel Session" confirmation button

### Section 4: Tutorials
- "Tutorials" section header with count on right ("2 videos")
- Tutorial cards: white card with gold-to-vermillion gradient accent line at top
  - Play icon (plum circle) or lock icon on left
  - Title + description + duration + uploader on right
  - Paid users: tap plays inline via expo-av
  - Unpaid users: tap shows "Contact admin to unlock" message
- Admin: "Upload Tutorial" button (plum background, white text)
  - Opens image picker → title input (inline, not Alert) → upload with progress → creates doc

### Section 5: Gallery
- "Gallery" header with count + "+ Add" link in gold
- 3-column grid of thumbnails with rounded corners
  - Photos: Image thumbnails
  - Videos: play icon overlay
  - Last tile: "+" button to add
- Tap photo → full-screen modal
- Tap video → inline playback
- Uploader/admin sees delete (✕) overlay on long press

## Design System Foundation

### New dependencies
- `@gorhom/bottom-sheet` — for cancel session flow (replaces Alert.prompt)
- `react-native-reanimated` — required by bottom-sheet, enables smooth animations
- `expo-haptics` — haptic feedback on RSVP toggle, button presses
- Note: `react-native-reanimated` and `@gorhom/bottom-sheet` are native deps — requires one EAS Build

### Shared components to create
These live in `src/components/` and are reused across screens:

- **`Avatar`** — initials circle with plum/gold backgrounds, configurable size
- **`AvatarStack`** — overlapping row of Avatar circles with "+N" overflow
- **`Card`** — white rounded card with shadow, optional gold left border
- **`SectionHeader`** — "TITLE" + optional right-side count/link
- **`GoldButton`** — full-width gold CTA button with haptic on press
- **`SegmentedControl`** — Calendar/List toggle pill
- **`PaymentBanner`** — conditional payment due banner, dismissable

### Typography scale
- Hero title: 26px, weight 800, plum
- Section title: 17px, weight 700, plum
- Card title: 16px, weight 600-700, plum
- Body: 14px, weight 400, muted plum (#5A4B6B)
- Caption: 12px, weight 400, gray (#9CA3AF)
- Label: 10-11px, weight 600-700, uppercase, tracked 1.5-2px, gold or gray

### Spacing
- Page padding: 20px horizontal
- Card padding: 16-18px
- Card margin: 8-10px vertical gap
- Card border-radius: 14-16px
- Section spacing: 20px between sections

### Shadows
- Cards: `0 2px 8px rgba(45, 27, 61, 0.06)`
- Elevated cards (hero): `0 8px 40px rgba(45, 27, 61, 0.12)`

## File-level changes

### Created
- `src/components/Avatar.tsx`
- `src/components/AvatarStack.tsx`
- `src/components/Card.tsx`
- `src/components/SectionHeader.tsx`
- `src/components/GoldButton.tsx`
- `src/components/SegmentedControl.tsx`
- `src/components/PaymentBanner.tsx`
- `src/theme/colors.ts` — centralized color constants
- `src/theme/typography.ts` — font size/weight constants
- `src/theme/spacing.ts` — spacing constants

### Rewritten
- `app/(participant)/home.tsx` — activity feed with next session hero
- `app/(participant)/schedule.tsx` — calendar + list toggle
- `app/(admin)/home.tsx` — same feed as participant (admin sees same content)
- `app/(admin)/sessions.tsx` — same schedule view as participant (admin sees same calendar)
- `app/session/[id].tsx` — full redesign with sections, bottom sheet, new card styles

### Untouched
- All hooks, lib functions, types — no data model changes
- Login, OTP, welcome screens (Wave 3)
- Me, Profile, Community, Chat, Videos tabs (Wave 2)
- Firestore rules, Cloud Functions

## Acceptance criteria

1. All three screens render with the Plum & Gold palette — no pink (#FEE7F1), no old purple (#3B0764), no yellow (#FACC15)
2. Home feed shows next session card with RSVP count + content feed (tutorials, photos, chat)
3. Schedule toggles between calendar and list views; calendar highlights session Tuesdays
4. Session detail has plum header, RSVP card, tutorials with paywall, gallery grid
5. Admin cancel uses bottom sheet, not Alert.prompt
6. Shared components exist in `src/components/` and are reused across screens
7. Theme constants in `src/theme/` — no hardcoded hex values in screen files
8. All existing tests still pass (no data model changes)
9. `npx tsc --noEmit` exits 0
10. Fast refresh works — visual changes appear on phone within seconds
