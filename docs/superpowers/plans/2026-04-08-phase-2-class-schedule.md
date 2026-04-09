# Rangtaal Phase 2 — Class & Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Participants see a real schedule of Tuesday Garba workshop sessions in the Schedule tab, tap one to see details, and RSVP. Admins see the same schedule with an admin-only button to seed the initial class + all sessions for the season. No payment gating yet (Phase 3) — any signed-in user can RSVP.

**Architecture:** Two new Firestore collections (`classes` and `sessions`). An admin-only "seed" action creates one `classes` document and batch-writes one `sessions` document per Tuesday from `seasonStart` to `seasonEnd`. Participants browse sessions via a real-time `onSnapshot` listener; the RSVP button mutates the session's `rsvps` array using `arrayUnion` / `arrayRemove`. A shared `session/[id]` detail route serves both roles and conditionally shows admin controls based on the user's role claim.

**Tech stack:** Existing Phase 1 stack (Expo Router, @react-native-firebase/firestore, Jest + RNTL). No new dependencies — dates are stored as ISO 8601 strings to avoid Firestore Timestamp mock complexity.

---

## File Structure

```
Rangtaal/
├── src/
│   ├── types/
│   │   ├── user.ts              (existing)
│   │   ├── class.ts             # NEW — ClassDoc type
│   │   └── session.ts           # NEW — SessionDoc, SessionStatus
│   ├── lib/
│   │   ├── users.ts             (existing)
│   │   ├── auth.ts              (existing)
│   │   ├── classes.ts           # NEW — getActiveClass, createClassAndSeason
│   │   └── sessions.ts          # NEW — getSessionsForClass, rsvpToSession, removeRsvp
│   └── hooks/
│       ├── useAuth.ts           (existing)
│       ├── useUser.ts           (existing)
│       ├── useActiveClass.ts    # NEW
│       ├── useSessions.ts       # NEW
│       └── useSession.ts        # NEW
├── app/
│   ├── _layout.tsx              # MODIFY — auth gate allows /session/*
│   ├── (participant)/
│   │   └── schedule.tsx         # MODIFY — real session list
│   ├── (admin)/
│   │   └── sessions.tsx         # MODIFY — real session list + seed button
│   └── session/
│       └── [id].tsx             # NEW — shared session detail route
├── __tests__/
│   ├── lib/
│   │   ├── classes.test.ts      # NEW
│   │   └── sessions.test.ts     # NEW
│   └── hooks/
│       ├── useActiveClass.test.tsx  # NEW
│       ├── useSessions.test.tsx     # NEW
│       └── useSession.test.tsx      # NEW
├── firestore.rules              # MODIFY — classes + sessions rules
└── jest.setup.ts                # MODIFY — arrayUnion/arrayRemove mocks
```

---

## Task 1: Define the Class type

**Files:**
- Create: `src/types/class.ts`

- [ ] **Step 1: Create `src/types/class.ts`**

```ts
export interface ClassDoc {
  id: string;
  name: string;
  location: string;
  address: string;
  dayOfWeek: "Tuesday";
  startTime: string;      // "19:30"
  endTime: string;        // "21:30"
  monthlyFee: number;     // 60
  seasonStart: string;    // ISO 8601, e.g. "2026-04-21T19:30:00-05:00"
  seasonEnd: string;      // ISO 8601
  active: boolean;
  createdAt: number;      // epoch ms; server timestamp at write
  createdBy: string;      // admin userId
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
git add src/types/class.ts
git commit -m "feat: define Class type"
```

---

## Task 2: Define the Session type

**Files:**
- Create: `src/types/session.ts`

- [ ] **Step 1: Create `src/types/session.ts`**

```ts
export type SessionStatus = "upcoming" | "completed" | "cancelled";

export interface SessionDoc {
  id: string;
  classId: string;
  date: string;              // ISO 8601 — session start datetime
  status: SessionStatus;
  rsvps: string[];           // array of participant userIds
  customMessage: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  reminderSent: {
    dayBefore: boolean;
    dayOf: boolean;
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/types/session.ts
git commit -m "feat: define Session type"
```

---

## Task 3: Extend jest mocks for arrayUnion and arrayRemove

**Files:**
- Modify: `jest.setup.ts`

> **Why:** Phase 2's RSVP helpers call `firestore.FieldValue.arrayUnion(userId)` and `firestore.FieldValue.arrayRemove(userId)`. The Phase 1 jest.setup.ts only stubbed `FieldValue.serverTimestamp`. Without extending the mock, every RSVP test will crash with "arrayUnion is not a function" before its assertion can run.

- [ ] **Step 1: Read current `jest.setup.ts`**

Run: `cat jest.setup.ts`
Confirm it currently has `firestoreMock.FieldValue = { serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP") };`

- [ ] **Step 2: Replace the `FieldValue` stub with one that also exposes arrayUnion/arrayRemove**

Find:
```ts
  firestoreMock.FieldValue = { serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP") };
```

Replace with:
```ts
  firestoreMock.FieldValue = {
    serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP"),
    arrayUnion: jest.fn((val) => ({ __op: "arrayUnion", val })),
    arrayRemove: jest.fn((val) => ({ __op: "arrayRemove", val })),
  };
```

The `__op` sentinel lets tests assert the exact operation without matching opaque Firestore internals.

- [ ] **Step 3: Run existing tests to confirm nothing regressed**

Run: `npm test`
Expected: all 10 pre-existing tests still pass, no new failures.

- [ ] **Step 4: Commit**

```bash
git add jest.setup.ts
git commit -m "chore: extend jest firestore mock with arrayUnion/arrayRemove"
```

---

## Task 4: TDD `getActiveClass` helper

**Files:**
- Create: `__tests__/lib/classes.test.ts`, `src/lib/classes.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/classes.test.ts`:
```ts
import firestore from "@react-native-firebase/firestore";
import { getActiveClass } from "../../src/lib/classes";

describe("getActiveClass", () => {
  it("returns the active class doc when present", async () => {
    const data = {
      name: "Garba Workshops 2026",
      location: "Roselle Park District",
      address: "555 W Bryn Mawr Ave, Roselle, IL",
      dayOfWeek: "Tuesday",
      startTime: "19:30",
      endTime: "21:30",
      monthlyFee: 60,
      seasonStart: "2026-04-21T19:30:00-05:00",
      seasonEnd: "2026-09-29T19:30:00-05:00",
      active: true,
      createdAt: 1700000000,
      createdBy: "admin1",
    };
    const getMock = jest.fn().mockResolvedValue({
      empty: false,
      docs: [{ id: "c1", data: () => data }],
    });
    const limitMock = jest.fn(() => ({ get: getMock }));
    const whereMock = jest.fn(() => ({ limit: limitMock }));
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ where: whereMock })),
    });

    const result = await getActiveClass();
    expect(whereMock).toHaveBeenCalledWith("active", "==", true);
    expect(limitMock).toHaveBeenCalledWith(1);
    expect(result).toEqual({ ...data, id: "c1" });
  });

  it("returns null when no active class exists", async () => {
    const getMock = jest.fn().mockResolvedValue({ empty: true, docs: [] });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({ limit: jest.fn(() => ({ get: getMock })) })),
      })),
    });

    const result = await getActiveClass();
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, confirm failure**

Run: `npm test -- classes.test.ts`
Expected: FAIL with `Cannot find module '../../src/lib/classes'`.

- [ ] **Step 3: Implement `src/lib/classes.ts`**

```ts
import firestore from "@react-native-firebase/firestore";
import { ClassDoc } from "../types/class";

export async function getActiveClass(): Promise<ClassDoc | null> {
  const snap = await firestore()
    .collection("classes")
    .where("active", "==", true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { ...(doc.data() as Omit<ClassDoc, "id">), id: doc.id };
}
```

- [ ] **Step 4: Re-run test, confirm pass**

Run: `npm test -- classes.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: TypeScript clean**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add __tests__/lib/classes.test.ts src/lib/classes.ts
git commit -m "feat: getActiveClass helper"
```

---

## Task 5: TDD `createClassAndSeason` helper

**Files:**
- Modify: `__tests__/lib/classes.test.ts`, `src/lib/classes.ts`

- [ ] **Step 1: Append failing test to `__tests__/lib/classes.test.ts`**

Add the import at the top of the file (merge into the existing import):
```ts
import { getActiveClass, createClassAndSeason } from "../../src/lib/classes";
```

Then add at the bottom of the file:
```ts
describe("createClassAndSeason", () => {
  it("creates a class and one session per Tuesday between seasonStart and seasonEnd", async () => {
    const classAddMock = jest.fn().mockResolvedValue({ id: "classA" });
    const batchSetMock = jest.fn();
    const batchCommitMock = jest.fn().mockResolvedValue(undefined);
    const batchMock = { set: batchSetMock, commit: batchCommitMock };

    // Deterministic docRef: each call returns a unique stubbed ref so
    // we can count how many sessions were queued on the batch.
    let sessionRefCount = 0;
    const sessionDocRef = () => {
      sessionRefCount += 1;
      return { id: `session${sessionRefCount}` };
    };

    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn((name: string) => {
        if (name === "classes") {
          return { add: classAddMock };
        }
        if (name === "sessions") {
          return { doc: jest.fn(() => sessionDocRef()) };
        }
        throw new Error(`unexpected collection ${name}`);
      }),
      batch: jest.fn(() => batchMock),
    });

    const result = await createClassAndSeason({
      name: "Garba Workshops 2026",
      location: "Roselle Park District",
      address: "555 W Bryn Mawr Ave, Roselle, IL",
      startTime: "19:30",
      endTime: "21:30",
      monthlyFee: 60,
      // Two Tuesdays inclusive: Apr 21 and Apr 28, 2026
      seasonStart: "2026-04-21T19:30:00-05:00",
      seasonEnd: "2026-04-28T19:30:00-05:00",
      adminUserId: "admin1",
    });

    expect(classAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Garba Workshops 2026",
        monthlyFee: 60,
        active: true,
        dayOfWeek: "Tuesday",
        createdBy: "admin1",
        createdAt: "SERVER_TIMESTAMP",
      })
    );
    expect(batchSetMock).toHaveBeenCalledTimes(2);
    // First session doc — Apr 21 2026
    expect(batchSetMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        classId: "classA",
        date: "2026-04-21T19:30:00-05:00",
        status: "upcoming",
        rsvps: [],
        customMessage: null,
        cancellationReason: null,
        cancelledAt: null,
        cancelledBy: null,
        reminderSent: { dayBefore: false, dayOf: false },
      })
    );
    // Second session — Apr 28 2026 (7 days later)
    expect(batchSetMock.mock.calls[1][1].date).toBe(
      "2026-04-28T19:30:00-05:00"
    );
    expect(batchCommitMock).toHaveBeenCalled();
    expect(result).toBe("classA");
  });
});
```

- [ ] **Step 2: Run test, confirm failure**

Run: `npm test -- classes.test.ts`
Expected: FAIL with `createClassAndSeason is not exported`.

- [ ] **Step 3: Implement `createClassAndSeason` in `src/lib/classes.ts`**

Append to `src/lib/classes.ts`:
```ts
export interface CreateClassSeasonInput {
  name: string;
  location: string;
  address: string;
  startTime: string;
  endTime: string;
  monthlyFee: number;
  seasonStart: string;    // ISO 8601
  seasonEnd: string;      // ISO 8601
  adminUserId: string;
}

export async function createClassAndSeason(
  input: CreateClassSeasonInput
): Promise<string> {
  const db = firestore();
  const classRef = await db.collection("classes").add({
    name: input.name,
    location: input.location,
    address: input.address,
    dayOfWeek: "Tuesday",
    startTime: input.startTime,
    endTime: input.endTime,
    monthlyFee: input.monthlyFee,
    seasonStart: input.seasonStart,
    seasonEnd: input.seasonEnd,
    active: true,
    createdAt: firestore.FieldValue.serverTimestamp(),
    createdBy: input.adminUserId,
  });

  // Generate one ISO date per Tuesday from seasonStart to seasonEnd (inclusive).
  const sessionDates = generateWeeklyDates(input.seasonStart, input.seasonEnd);

  const batch = db.batch();
  for (const date of sessionDates) {
    const ref = db.collection("sessions").doc();
    batch.set(ref, {
      classId: classRef.id,
      date,
      status: "upcoming",
      rsvps: [],
      customMessage: null,
      cancellationReason: null,
      cancelledAt: null,
      cancelledBy: null,
      reminderSent: { dayBefore: false, dayOf: false },
    });
  }
  await batch.commit();

  return classRef.id;
}

function generateWeeklyDates(startIso: string, endIso: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(startIso);
  const end = new Date(endIso);
  while (cursor.getTime() <= end.getTime()) {
    dates.push(cursor.toISOString().replace("Z", "-05:00")); // Preserve -05:00 offset
    cursor.setDate(cursor.getDate() + 7);
  }
  return dates;
}
```

> **Note on the date preservation:** `new Date(isoString).toISOString()` normalizes to UTC with a `Z` suffix. For Phase 2 we want to keep the `-05:00` Central Daylight Time offset in the stored ISO string so UI formatting stays simple. If the season spans DST (which Apr 21 → Sep 29 does NOT, since DST ends Nov 1), this would need refinement — for Phase 2 MVP, hardcoding `-05:00` is acceptable.

- [ ] **Step 4: Re-run test, confirm pass**

Run: `npm test -- classes.test.ts`
Expected: PASS (3 tests in this file).

- [ ] **Step 5: TypeScript clean**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add __tests__/lib/classes.test.ts src/lib/classes.ts
git commit -m "feat: createClassAndSeason helper generates weekly sessions"
```

---

## Task 6: TDD `getSessionsForClass` helper

**Files:**
- Create: `__tests__/lib/sessions.test.ts`, `src/lib/sessions.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/sessions.test.ts`:
```ts
import firestore from "@react-native-firebase/firestore";
import { getSessionsForClass } from "../../src/lib/sessions";

describe("getSessionsForClass", () => {
  it("queries sessions by classId ordered by date asc", async () => {
    const sessionDocs = [
      { id: "s1", data: () => ({ classId: "c1", date: "2026-04-21T19:30:00-05:00", status: "upcoming", rsvps: [], customMessage: null, cancellationReason: null, cancelledAt: null, cancelledBy: null, reminderSent: { dayBefore: false, dayOf: false } }) },
      { id: "s2", data: () => ({ classId: "c1", date: "2026-04-28T19:30:00-05:00", status: "upcoming", rsvps: ["u1"], customMessage: null, cancellationReason: null, cancelledAt: null, cancelledBy: null, reminderSent: { dayBefore: false, dayOf: false } }) },
    ];
    const getMock = jest.fn().mockResolvedValue({ docs: sessionDocs });
    const orderByMock = jest.fn(() => ({ get: getMock }));
    const whereMock = jest.fn(() => ({ orderBy: orderByMock }));
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ where: whereMock })),
    });

    const result = await getSessionsForClass("c1");
    expect(whereMock).toHaveBeenCalledWith("classId", "==", "c1");
    expect(orderByMock).toHaveBeenCalledWith("date", "asc");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("s1");
    expect(result[0].date).toBe("2026-04-21T19:30:00-05:00");
    expect(result[1].rsvps).toEqual(["u1"]);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `npm test -- sessions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/sessions.ts`**

```ts
import firestore from "@react-native-firebase/firestore";
import { SessionDoc } from "../types/session";

export async function getSessionsForClass(classId: string): Promise<SessionDoc[]> {
  const snap = await firestore()
    .collection("sessions")
    .where("classId", "==", classId)
    .orderBy("date", "asc")
    .get();
  return snap.docs.map((doc) => ({
    ...(doc.data() as Omit<SessionDoc, "id">),
    id: doc.id,
  }));
}
```

- [ ] **Step 4: Re-run, confirm pass**

Run: `npm test -- sessions.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: TypeScript clean**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add __tests__/lib/sessions.test.ts src/lib/sessions.ts
git commit -m "feat: getSessionsForClass helper"
```

---

## Task 7: TDD `rsvpToSession` helper

**Files:**
- Modify: `__tests__/lib/sessions.test.ts`, `src/lib/sessions.ts`

- [ ] **Step 1: Append failing test**

Update the import at the top of `__tests__/lib/sessions.test.ts`:
```ts
import { getSessionsForClass, rsvpToSession } from "../../src/lib/sessions";
```

Append to the bottom of the file:
```ts
describe("rsvpToSession", () => {
  it("calls update with arrayUnion(userId) on the session doc", async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ update: updateMock })),
      })),
    });

    await rsvpToSession("session1", "user1");

    expect(updateMock).toHaveBeenCalledWith({
      rsvps: { __op: "arrayUnion", val: "user1" },
    });
  });
});
```

> **Note:** The `{ __op, val }` shape matches the mock in `jest.setup.ts` from Task 3.

- [ ] **Step 2: Run, confirm failure**

Run: `npm test -- sessions.test.ts`
Expected: FAIL — `rsvpToSession` not exported.

- [ ] **Step 3: Implement `rsvpToSession`**

Append to `src/lib/sessions.ts`:
```ts
export async function rsvpToSession(sessionId: string, userId: string): Promise<void> {
  await firestore()
    .collection("sessions")
    .doc(sessionId)
    .update({
      rsvps: firestore.FieldValue.arrayUnion(userId),
    });
}
```

- [ ] **Step 4: Re-run, confirm pass**

Run: `npm test -- sessions.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add __tests__/lib/sessions.test.ts src/lib/sessions.ts
git commit -m "feat: rsvpToSession helper"
```

---

## Task 8: TDD `removeRsvp` helper

**Files:**
- Modify: `__tests__/lib/sessions.test.ts`, `src/lib/sessions.ts`

- [ ] **Step 1: Append failing test**

Update the import:
```ts
import { getSessionsForClass, rsvpToSession, removeRsvp } from "../../src/lib/sessions";
```

Append to the bottom of the file:
```ts
describe("removeRsvp", () => {
  it("calls update with arrayRemove(userId) on the session doc", async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ update: updateMock })),
      })),
    });

    await removeRsvp("session1", "user1");

    expect(updateMock).toHaveBeenCalledWith({
      rsvps: { __op: "arrayRemove", val: "user1" },
    });
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `npm test -- sessions.test.ts`
Expected: FAIL — `removeRsvp` not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/sessions.ts`:
```ts
export async function removeRsvp(sessionId: string, userId: string): Promise<void> {
  await firestore()
    .collection("sessions")
    .doc(sessionId)
    .update({
      rsvps: firestore.FieldValue.arrayRemove(userId),
    });
}
```

- [ ] **Step 4: Re-run, confirm pass**

Run: `npm test -- sessions.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add __tests__/lib/sessions.test.ts src/lib/sessions.ts
git commit -m "feat: removeRsvp helper"
```

---

## Task 9: TDD `useActiveClass` hook

**Files:**
- Create: `__tests__/hooks/useActiveClass.test.tsx`, `src/hooks/useActiveClass.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/hooks/useActiveClass.test.tsx`:
```tsx
import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import firestore from "@react-native-firebase/firestore";
import { useActiveClass } from "../../src/hooks/useActiveClass";

describe("useActiveClass", () => {
  it("starts loading and resolves to the active class doc", async () => {
    const data = {
      name: "Garba Workshops 2026",
      location: "Roselle Park District",
      address: "555 W Bryn Mawr Ave",
      dayOfWeek: "Tuesday",
      startTime: "19:30",
      endTime: "21:30",
      monthlyFee: 60,
      seasonStart: "2026-04-21T19:30:00-05:00",
      seasonEnd: "2026-09-29T19:30:00-05:00",
      active: true,
      createdAt: 1,
      createdBy: "admin1",
    };
    const getMock = jest.fn().mockResolvedValue({
      empty: false,
      docs: [{ id: "c1", data: () => data }],
    });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({ limit: jest.fn(() => ({ get: getMock })) })),
      })),
    });

    const { result } = renderHook(() => useActiveClass());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.class_?.id).toBe("c1");
    expect(result.current.class_?.name).toBe("Garba Workshops 2026");
  });

  it("resolves to null when no active class exists", async () => {
    const getMock = jest.fn().mockResolvedValue({ empty: true, docs: [] });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({ limit: jest.fn(() => ({ get: getMock })) })),
      })),
    });

    const { result } = renderHook(() => useActiveClass());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.class_).toBeNull();
  });
});
```

> **Note:** The property name is `class_` (trailing underscore) because `class` is a reserved JavaScript keyword.

- [ ] **Step 2: Run, confirm failure**

Run: `npm test -- useActiveClass.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/hooks/useActiveClass.ts`**

```ts
import { useEffect, useState } from "react";
import { getActiveClass } from "../lib/classes";
import { ClassDoc } from "../types/class";

export interface UseActiveClassState {
  class_: ClassDoc | null;
  loading: boolean;
}

export function useActiveClass(): UseActiveClassState {
  const [state, setState] = useState<UseActiveClassState>({
    class_: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    getActiveClass().then((c) => {
      if (!cancelled) setState({ class_: c, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
```

- [ ] **Step 4: Re-run, confirm pass**

Run: `npm test -- useActiveClass.test`
Expected: PASS (2 tests).

- [ ] **Step 5: TypeScript clean**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add __tests__/hooks/useActiveClass.test.tsx src/hooks/useActiveClass.ts
git commit -m "feat: useActiveClass hook"
```

---

## Task 10: TDD `useSessions` hook (live updates)

**Files:**
- Create: `__tests__/hooks/useSessions.test.tsx`, `src/hooks/useSessions.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/hooks/useSessions.test.tsx`:
```tsx
import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import firestore from "@react-native-firebase/firestore";
import { useSessions } from "../../src/hooks/useSessions";

describe("useSessions", () => {
  it("subscribes to sessions for a class and updates state on snapshot", async () => {
    let snapCb: ((snap: any) => void) | undefined;
    const onSnapshotMock = jest.fn((cb) => {
      snapCb = cb;
      return () => undefined;
    });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(() => ({ onSnapshot: onSnapshotMock })),
        })),
      })),
    });

    const { result } = renderHook(() => useSessions("c1"));
    expect(result.current.loading).toBe(true);

    await act(async () => {
      snapCb?.({
        docs: [
          {
            id: "s1",
            data: () => ({
              classId: "c1",
              date: "2026-04-21T19:30:00-05:00",
              status: "upcoming",
              rsvps: [],
              customMessage: null,
              cancellationReason: null,
              cancelledAt: null,
              cancelledBy: null,
              reminderSent: { dayBefore: false, dayOf: false },
            }),
          },
        ],
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].id).toBe("s1");
  });

  it("returns empty list when classId is undefined", () => {
    const { result } = renderHook(() => useSessions(undefined));
    expect(result.current.sessions).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `npm test -- useSessions.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/hooks/useSessions.ts`**

```ts
import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { SessionDoc } from "../types/session";

export interface UseSessionsState {
  sessions: SessionDoc[];
  loading: boolean;
}

export function useSessions(classId: string | undefined): UseSessionsState {
  const [state, setState] = useState<UseSessionsState>({
    sessions: [],
    loading: !!classId,
  });

  useEffect(() => {
    if (!classId) {
      setState({ sessions: [], loading: false });
      return;
    }
    const unsub = firestore()
      .collection("sessions")
      .where("classId", "==", classId)
      .orderBy("date", "asc")
      .onSnapshot((snap) => {
        const sessions = snap.docs.map((d) => ({
          ...(d.data() as Omit<SessionDoc, "id">),
          id: d.id,
        }));
        setState({ sessions, loading: false });
      });
    return unsub;
  }, [classId]);

  return state;
}
```

- [ ] **Step 4: Re-run, confirm pass**

Run: `npm test -- useSessions.test`
Expected: PASS (2 tests).

- [ ] **Step 5: TypeScript clean**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add __tests__/hooks/useSessions.test.tsx src/hooks/useSessions.ts
git commit -m "feat: useSessions hook (live session list)"
```

---

## Task 11: TDD `useSession` hook (single session by id)

**Files:**
- Create: `__tests__/hooks/useSession.test.tsx`, `src/hooks/useSession.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/hooks/useSession.test.tsx`:
```tsx
import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import firestore from "@react-native-firebase/firestore";
import { useSession } from "../../src/hooks/useSession";

describe("useSession", () => {
  it("subscribes to a single session doc by id and updates on snapshot", async () => {
    let snapCb: ((snap: any) => void) | undefined;
    const onSnapshotMock = jest.fn((cb) => {
      snapCb = cb;
      return () => undefined;
    });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ onSnapshot: onSnapshotMock })),
      })),
    });

    const { result } = renderHook(() => useSession("s1"));
    expect(result.current.loading).toBe(true);

    await act(async () => {
      snapCb?.({
        exists: () => true,
        id: "s1",
        data: () => ({
          classId: "c1",
          date: "2026-04-21T19:30:00-05:00",
          status: "upcoming",
          rsvps: ["u1"],
          customMessage: null,
          cancellationReason: null,
          cancelledAt: null,
          cancelledBy: null,
          reminderSent: { dayBefore: false, dayOf: false },
        }),
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.session?.id).toBe("s1");
    expect(result.current.session?.rsvps).toEqual(["u1"]);
  });

  it("returns null session when id is undefined", () => {
    const { result } = renderHook(() => useSession(undefined));
    expect(result.current.session).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `npm test -- useSession.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/hooks/useSession.ts`**

```ts
import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { SessionDoc } from "../types/session";

export interface UseSessionState {
  session: SessionDoc | null;
  loading: boolean;
}

export function useSession(id: string | undefined): UseSessionState {
  const [state, setState] = useState<UseSessionState>({
    session: null,
    loading: !!id,
  });

  useEffect(() => {
    if (!id) {
      setState({ session: null, loading: false });
      return;
    }
    const unsub = firestore()
      .collection("sessions")
      .doc(id)
      .onSnapshot((snap) => {
        if (!snap.exists()) {
          setState({ session: null, loading: false });
          return;
        }
        setState({
          session: { ...(snap.data() as Omit<SessionDoc, "id">), id: snap.id },
          loading: false,
        });
      });
    return unsub;
  }, [id]);

  return state;
}
```

- [ ] **Step 4: Re-run, confirm pass**

Run: `npm test -- useSession.test`
Expected: PASS (2 tests).

- [ ] **Step 5: TypeScript clean**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add __tests__/hooks/useSession.test.tsx src/hooks/useSession.ts
git commit -m "feat: useSession hook for single session subscription"
```

---

## Task 12: Update Firestore security rules for classes and sessions

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Read current `firestore.rules`**

Run: `cat firestore.rules`
Confirm the existing `users/{uid}` match block is present.

- [ ] **Step 2: Append new match blocks before the closing `}`**

Add the following BEFORE the final `}` that closes `match /databases/{database}/documents`:

```
    match /classes/{classId} {
      allow read: if isSignedIn();
      allow create, update, delete: if isAdmin();
    }

    match /sessions/{sessionId} {
      allow read: if isSignedIn();
      allow create, delete: if isAdmin();
      // Admin can update anything.
      // Participants can update ONLY the rsvps array with their own uid.
      allow update: if isAdmin() ||
        (isSignedIn()
         && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['rsvps']));
    }
```

The final `firestore.rules` file should end up looking like:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }
    function isSelf(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }
    function isAdmin() {
      return isSignedIn()
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /users/{uid} {
      allow read: if isSelf(uid) || isAdmin();
      allow create: if isSelf(uid)
        && request.resource.data.role == 'participant'
        && request.resource.data.uid == uid;
      allow update: if isSelf(uid)
        && request.resource.data.role == resource.data.role;
      allow delete: if false;
    }

    match /classes/{classId} {
      allow read: if isSignedIn();
      allow create, update, delete: if isAdmin();
    }

    match /sessions/{sessionId} {
      allow read: if isSignedIn();
      allow create, delete: if isAdmin();
      allow update: if isAdmin() ||
        (isSignedIn()
         && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['rsvps']));
    }
  }
}
```

> **Note on the rsvps rule:** Firestore doesn't let rules inspect array diffs directly, so we permit any signed-in user to update the `rsvps` field as a whole. The client always calls `arrayUnion(currentUserId)` or `arrayRemove(currentUserId)`, so in practice they can only add/remove their own uid. A malicious client could technically modify other users' uids in the array — we'd harden this via a Cloud Function in a later phase. For Phase 2 MVP, the client-side constraint plus a trusted admin manual review is sufficient.

- [ ] **Step 3: Commit the rules (but don't deploy yet — Task 13 deploys)**

```bash
git add firestore.rules
git commit -m "feat: firestore rules for classes and sessions collections"
```

---

## Task 13: Deploy the updated Firestore rules

**Files:** None (deploy only)

- [ ] **Step 1: Deploy**

Run: `firebase deploy --only firestore:rules`
Expected: `✔ Deploy complete!` within ~30 seconds.

- [ ] **Step 2: Verify in Firebase Console**

Open https://console.firebase.google.com/project/rangtaal-app/firestore/rules and visually confirm the deployed rules now include `classes` and `sessions` match blocks. No commit needed — deploy is external to git.

---

## Task 14: Allow `/session/*` routes through the auth gate

**Files:**
- Modify: `app/_layout.tsx`

> **Why:** The current root auth gate from Phase 1 redirects any signed-in user to either `(participant)/home` or `(admin)/home` if they're not already in their role-specific group. Our new `session/[id].tsx` lives at the top level (outside both groups) so it's accessible to both roles — but the auth gate would bounce users away. We need to whitelist the `session` segment.

- [ ] **Step 1: Read the current `app/_layout.tsx`**

Run: `cat app/_layout.tsx`
Confirm it contains the `useEffect` with the redirect logic.

- [ ] **Step 2: Replace the `useEffect` body**

Find:
```tsx
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inParticipantGroup = segments[0] === "(participant)";
    const inAdminGroup = segments[0] === "(admin)";

    if (!authUser) {
      if (!inAuthGroup) router.replace("/(auth)/login" as any);
      return;
    }

    if (authUser && !userDoc) {
      if ((segments as string[])[1] !== "welcome") router.replace("/(auth)/welcome" as any);
      return;
    }

    if (userDoc?.role === "admin") {
      if (!inAdminGroup) router.replace("/(admin)/home" as any);
    } else {
      if (!inParticipantGroup) router.replace("/(participant)/home" as any);
    }
  }, [authUser, userDoc, loading, segments, router]);
```

Replace with:
```tsx
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inParticipantGroup = segments[0] === "(participant)";
    const inAdminGroup = segments[0] === "(admin)";
    const inSessionRoute = segments[0] === "session";

    if (!authUser) {
      if (!inAuthGroup) router.replace("/(auth)/login" as any);
      return;
    }

    if (authUser && !userDoc) {
      if ((segments as string[])[1] !== "welcome") router.replace("/(auth)/welcome" as any);
      return;
    }

    // Shared routes like /session/[id] are accessible to both roles
    // — skip the role-group redirect if the user is already on one.
    if (inSessionRoute) return;

    if (userDoc?.role === "admin") {
      if (!inAdminGroup) router.replace("/(admin)/home" as any);
    } else {
      if (!inParticipantGroup) router.replace("/(participant)/home" as any);
    }
  }, [authUser, userDoc, loading, segments, router]);
```

- [ ] **Step 3: TypeScript clean**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: auth gate permits shared /session/* routes"
```

---

## Task 15: Implement the Participant Schedule tab

**Files:**
- Modify: `app/(participant)/schedule.tsx`

- [ ] **Step 1: Replace placeholder with real session list**

Replace the entire contents of `app/(participant)/schedule.tsx` with:
```tsx
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useActiveClass } from "../../src/hooks/useActiveClass";
import { useSessions } from "../../src/hooks/useSessions";
import { SessionDoc } from "../../src/types/session";

export default function ParticipantSchedule() {
  const router = useRouter();
  const { class_, loading: classLoading } = useActiveClass();
  const { sessions, loading: sessionsLoading } = useSessions(class_?.id);

  const loading = classLoading || sessionsLoading;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!class_) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>No active class</Text>
        <Text style={styles.sub}>An admin needs to set up the season first.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{class_.name}</Text>
      <Text style={styles.subheader}>
        {class_.location} · {class_.startTime}–{class_.endTime}
      </Text>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingVertical: 12 }}
        renderItem={({ item }) => (
          <SessionRow session={item} onPress={() => router.push(("/session/" + item.id) as any)} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No sessions scheduled yet.</Text>
        }
      />
    </View>
  );
}

function SessionRow({ session, onPress }: { session: SessionDoc; onPress: () => void }) {
  const d = new Date(session.date);
  const dateLabel = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const cancelled = session.status === "cancelled";
  return (
    <TouchableOpacity style={[styles.row, cancelled && styles.rowCancelled]} onPress={onPress}>
      <View>
        <Text style={[styles.rowDate, cancelled && styles.textStrike]}>{dateLabel}</Text>
        <Text style={styles.rowMeta}>
          {cancelled ? "Cancelled" : `${session.rsvps.length} RSVP${session.rsvps.length === 1 ? "" : "s"}`}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FEE7F1", padding: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FEE7F1", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", color: "#3B0764" },
  sub: { fontSize: 14, color: "#3B0764", marginTop: 8, textAlign: "center" },
  header: { fontSize: 24, fontWeight: "700", color: "#3B0764" },
  subheader: { fontSize: 14, color: "#3B0764", marginTop: 4, marginBottom: 8 },
  row: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowCancelled: { opacity: 0.5 },
  rowDate: { fontSize: 16, fontWeight: "600", color: "#3B0764" },
  rowMeta: { fontSize: 12, color: "#3B0764", marginTop: 4 },
  textStrike: { textDecorationLine: "line-through" },
  chevron: { fontSize: 22, color: "#9CA3AF" },
  empty: { textAlign: "center", color: "#3B0764", marginTop: 24 },
});
```

- [ ] **Step 2: TypeScript clean**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/(participant)/schedule.tsx
git commit -m "feat: participant schedule tab shows real session list"
```

---

## Task 16: Implement the shared Session Detail route

**Files:**
- Create: `app/session/_layout.tsx`, `app/session/[id].tsx`

- [ ] **Step 1: Create `app/session/_layout.tsx`**

```tsx
import { Stack } from "expo-router";

export default function SessionLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: "Back", title: "Session" }} />
  );
}
```

- [ ] **Step 2: Create `app/session/[id].tsx`**

```tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../src/hooks/useAuth";
import { useSession } from "../../src/hooks/useSession";
import { useUser } from "../../src/hooks/useUser";
import { rsvpToSession, removeRsvp } from "../../src/lib/sessions";
import { useActiveClass } from "../../src/hooks/useActiveClass";

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { user: userDoc } = useUser(authUser?.uid);
  const { class_ } = useActiveClass();
  const { session, loading } = useSession(id);
  const [submitting, setSubmitting] = useState(false);

  if (loading || !class_) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Session not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const d = new Date(session.date);
  const dateLabel = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const isRsvped = !!authUser && session.rsvps.includes(authUser.uid);
  const cancelled = session.status === "cancelled";
  const isAdmin = userDoc?.role === "admin";

  async function handleToggleRsvp() {
    if (!authUser || !id) return;
    setSubmitting(true);
    try {
      if (isRsvped) {
        await removeRsvp(id, authUser.uid);
      } else {
        await rsvpToSession(id, authUser.uid);
      }
    } catch (err: any) {
      Alert.alert("RSVP failed", err?.message ?? "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.date}>{dateLabel}</Text>
      <Text style={styles.time}>
        {class_.startTime} – {class_.endTime}
      </Text>
      <Text style={styles.location}>{class_.location}</Text>
      <Text style={styles.address}>{class_.address}</Text>

      {cancelled ? (
        <View style={styles.cancelledBanner}>
          <Text style={styles.cancelledTitle}>This session was cancelled</Text>
          {session.cancellationReason ? (
            <Text style={styles.cancelledReason}>{session.cancellationReason}</Text>
          ) : null}
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.rsvpBtn, isRsvped && styles.rsvpBtnActive, submitting && { opacity: 0.5 }]}
          onPress={handleToggleRsvp}
          disabled={submitting}
        >
          <Text style={[styles.rsvpBtnText, isRsvped && styles.rsvpBtnTextActive]}>
            {submitting ? "Saving..." : isRsvped ? "You're in! (Tap to remove)" : "RSVP"}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.rsvpCount}>
        {session.rsvps.length} {session.rsvps.length === 1 ? "person" : "people"} RSVP'd
      </Text>

      {isAdmin && !cancelled ? (
        <View style={styles.adminBox}>
          <Text style={styles.adminLabel}>Admin actions</Text>
          <Text style={styles.adminStub}>
            Cancel and custom-message flows arrive in Phase 4.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FEE7F1", padding: 24 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FEE7F1", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", color: "#3B0764" },
  date: { fontSize: 28, fontWeight: "700", color: "#3B0764" },
  time: { fontSize: 18, color: "#3B0764", marginTop: 4 },
  location: { fontSize: 16, color: "#3B0764", marginTop: 16, fontWeight: "600" },
  address: { fontSize: 14, color: "#3B0764", marginTop: 4 },
  rsvpBtn: {
    backgroundColor: "#FACC15",
    borderRadius: 32,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 32,
  },
  rsvpBtnActive: { backgroundColor: "#3B0764" },
  rsvpBtnText: { fontSize: 16, fontWeight: "700", color: "#3B0764" },
  rsvpBtnTextActive: { color: "#FACC15" },
  rsvpCount: { fontSize: 14, color: "#3B0764", textAlign: "center", marginTop: 12 },
  cancelledBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  cancelledTitle: { fontSize: 16, fontWeight: "700", color: "#991B1B" },
  cancelledReason: { fontSize: 14, color: "#991B1B", marginTop: 4 },
  adminBox: {
    marginTop: 32,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FACC15",
  },
  adminLabel: { fontSize: 12, fontWeight: "700", color: "#3B0764", letterSpacing: 1 },
  adminStub: { fontSize: 12, color: "#3B0764", marginTop: 4 },
  backBtn: { marginTop: 16, backgroundColor: "#FACC15", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 32 },
  backBtnText: { color: "#3B0764", fontWeight: "700" },
});
```

- [ ] **Step 3: TypeScript clean**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add app/session/_layout.tsx app/session/[id].tsx
git commit -m "feat: shared session detail route with RSVP toggle"
```

---

## Task 17: Implement the Admin Sessions tab with seed button

**Files:**
- Modify: `app/(admin)/sessions.tsx`

- [ ] **Step 1: Replace the placeholder**

Replace the entire contents of `app/(admin)/sessions.tsx` with:
```tsx
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../src/hooks/useAuth";
import { useActiveClass } from "../../src/hooks/useActiveClass";
import { useSessions } from "../../src/hooks/useSessions";
import { createClassAndSeason } from "../../src/lib/classes";
import { SessionDoc } from "../../src/types/session";

const DEFAULT_SEASON = {
  name: "Garba Workshops 2026",
  location: "Roselle Park District, Maple Room",
  address: "555 W Bryn Mawr Ave, Roselle, IL 60172",
  startTime: "19:30",
  endTime: "21:30",
  monthlyFee: 60,
  seasonStart: "2026-04-21T19:30:00-05:00",
  seasonEnd: "2026-09-29T19:30:00-05:00",
};

export default function AdminSessions() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { class_, loading: classLoading } = useActiveClass();
  const { sessions, loading: sessionsLoading } = useSessions(class_?.id);
  const [seeding, setSeeding] = useState(false);

  async function handleSeed() {
    if (!authUser) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Create the 2026 season?",
        "This creates the Garba Workshops class and one session per Tuesday from April 21 through September 29, 2026.",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Create", onPress: () => resolve(true) },
        ]
      );
    });
    if (!confirmed) return;
    setSeeding(true);
    try {
      await createClassAndSeason({
        ...DEFAULT_SEASON,
        adminUserId: authUser.uid,
      });
    } catch (err: any) {
      Alert.alert("Seed failed", err?.message ?? "Unknown error");
    } finally {
      setSeeding(false);
    }
  }

  if (classLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!class_) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>No class yet</Text>
        <Text style={styles.sub}>Tap below to create the 2026 season.</Text>
        <TouchableOpacity
          style={[styles.seedBtn, seeding && { opacity: 0.5 }]}
          onPress={handleSeed}
          disabled={seeding}
        >
          <Text style={styles.seedBtnText}>
            {seeding ? "Creating..." : "Create 2026 Season"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{class_.name}</Text>
      <Text style={styles.subheader}>
        {sessions.length} sessions · {sessions.filter((s) => s.status === "upcoming").length} upcoming
      </Text>
      {sessionsLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingVertical: 12 }}
          renderItem={({ item }) => (
            <AdminSessionRow session={item} onPress={() => router.push(("/session/" + item.id) as any)} />
          )}
        />
      )}
    </View>
  );
}

function AdminSessionRow({ session, onPress }: { session: SessionDoc; onPress: () => void }) {
  const d = new Date(session.date);
  const dateLabel = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowDate}>{dateLabel}</Text>
        <Text style={styles.rowMeta}>
          {session.status} · {session.rsvps.length} RSVP{session.rsvps.length === 1 ? "" : "s"}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FEE7F1", padding: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FEE7F1", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", color: "#3B0764" },
  sub: { fontSize: 14, color: "#3B0764", marginTop: 8, textAlign: "center" },
  header: { fontSize: 24, fontWeight: "700", color: "#3B0764" },
  subheader: { fontSize: 14, color: "#3B0764", marginTop: 4, marginBottom: 8 },
  seedBtn: { backgroundColor: "#FACC15", borderRadius: 32, paddingHorizontal: 32, paddingVertical: 16, marginTop: 24 },
  seedBtnText: { fontSize: 16, fontWeight: "700", color: "#3B0764" },
  row: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  rowDate: { fontSize: 16, fontWeight: "600", color: "#3B0764" },
  rowMeta: { fontSize: 12, color: "#3B0764", marginTop: 4 },
  chevron: { fontSize: 22, color: "#9CA3AF" },
});
```

- [ ] **Step 2: TypeScript clean**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/sessions.tsx
git commit -m "feat: admin sessions tab with seed button and session list"
```

---

## Task 18: Run the full test suite and manual smoke test

**Files:** None

- [ ] **Step 1: Run all unit tests**

Run: `npm test`
Expected: all tests pass (Phase 1's 10 + Phase 2's ~12 = ~22 total passing).

- [ ] **Step 2: Build and run on your iPhone**

In terminal one:
```bash
source .env.local && npx expo start --dev-client
```

If Metro alone isn't enough (e.g., if you haven't built since the last config change), run:
```bash
source .env.local && npx expo run:ios --device
```

Reload the app on your phone once Metro is ready.

- [ ] **Step 3: Admin seed flow**

1. If you're still a participant, promote yourself to admin by editing your Firestore user doc in the Firebase Console (set `role: "admin"`).
2. Reload the app — you should see the admin tab bar.
3. Go to the **Sessions** tab.
4. Tap **Create 2026 Season**.
5. Confirm the alert.
6. After a few seconds, the tab should show `Garba Workshops 2026 · 24 sessions · 24 upcoming`.

- [ ] **Step 4: Verify Firestore state**

Open the Firebase Console → Firestore → Data.
- `classes` collection should have exactly 1 document.
- `sessions` collection should have 24 documents, each with `classId` pointing at the class doc.

- [ ] **Step 5: Participant RSVP flow**

1. Revert your user doc to `role: "participant"` in Firestore.
2. Reload the app — participant tab bar now shows.
3. Tap **Schedule** — you see the full list of Tuesday sessions.
4. Tap the first session.
5. Tap **RSVP** — the button updates to "You're in! (Tap to remove)".
6. Go back to the Schedule tab — the session row should now show "1 RSVP".
7. Re-open the same session, tap to remove the RSVP, verify it goes back to "0 RSVPs".

- [ ] **Step 6: Report results**

- ✅ If all steps pass, proceed to Task 19.
- ❌ If anything fails, capture the error (Metro log + iOS device log via `idevicesyslog` if native) and stop here — the failure tells us what to fix.

---

## Task 19: Final commit and tag

**Files:** None

- [ ] **Step 1: Final `npm test`**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Confirm clean tree**

Run: `git status`
Expected: `nothing to commit, working tree clean`.

- [ ] **Step 3: Tag Phase 2**

```bash
git tag -a phase-2-schedule -m "Phase 2: Class & Schedule complete

- classes and sessions Firestore collections
- Admin seed flow: one class + 24 Tuesday sessions for the 2026 season
- Participant Schedule tab with live session list
- Session Detail screen with RSVP toggle
- Admin Sessions tab with seed button
- Firestore security rules for classes/sessions/rsvp writes
- Root auth gate permits shared /session/* routes

Deferred to later phases:
- Payment gating on RSVP (Phase 3)
- SMS reminders and cancellation notifications (Phase 4)
- Tutorial videos paywalled by payment (Phase 5)
- AI message composer (Phase 7)
"
```

- [ ] **Step 4: Push branch + tag**

```bash
git push origin refs/heads/phase-1-foundation
git push origin refs/tags/phase-2-schedule
```

> **Note:** We're still on the `phase-1-foundation` branch because Phase 2 builds directly on top of Phase 1's work. If you later want a dedicated `phase-2-schedule` branch, cut one from this point.

---

## Phase 2 Done — What You Have

- **2 new Firestore collections** (`classes` and `sessions`) with security rules
- **24 seeded Tuesday sessions** for the 2026 Garba Workshops season (April 21 → September 29)
- **Real Schedule tab** for participants with live updates
- **Shared Session Detail route** accessible from both role tab bars
- **RSVP flow** — any signed-in participant can RSVP, toggles are real-time
- **Admin Sessions tab** with a one-tap seed action
- **~22 unit tests passing** (Phase 1's 10 + Phase 2's ~12)
- Clean separation between data helpers (`src/lib`), hooks (`src/hooks`), and screens (`app/`)

## What's Next (Phase 3)

Phase 3 layers payment gating on top of Phase 2's RSVP flow:
- Stripe integration (saved card on file)
- `payments` collection and monthly billing logic
- RSVP button becomes "Pay $60 to RSVP" if the user hasn't paid for the current month
- Admin marks offline payments (Zelle/cash) as received
- Payment history screen on the Me tab
- Monthly opt-out admin flow

Phase 3 has no new native dependencies (Stripe SDK is already on the roadmap but we'll add it then). Most of Phase 3 is JS work that will hot-reload instantly.
