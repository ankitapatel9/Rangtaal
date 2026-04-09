# Feature 1: Payment Flag — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin can toggle a `paid` boolean on any user; participants see their payment status; tutorials paywall checks this field.

**Architecture:** Add `paid: boolean` to `UserDoc`, a `toggleUserPaid` helper, a `useAllUsers` hook for the admin user list, update admin Community tab and participant Me tab, tighten Firestore rules.

**Tech Stack:** TypeScript · @react-native-firebase/firestore · Jest · RNTL

**Reference spec:** `docs/superpowers/specs/2026-04-09-phase-3-payments-videos-notifications-design.md` § Feature 1

---

### Task 1: Extend UserDoc with `paid` field

**Files:**
- Modify: `src/types/user.ts`

- [ ] **Step 1: Add `paid` to UserDoc**

```ts
export interface UserDoc {
  uid: string;
  name: string;
  phoneNumber: string;
  role: UserRole;
  paid: boolean;
  createdAt: number;
}
```

- [ ] **Step 2: Update `createUserDoc` in `src/lib/users.ts` to set `paid: false` on new users**

Add `paid: false` to the `ref.set()` call, after `role: "participant"`.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Run existing tests**

Run: `npm test`
Expected: all 22 tests pass (existing mocks return data without `paid`, which is fine — TypeScript won't enforce it at runtime in test mocks).

- [ ] **Step 5: Commit**

```bash
git add src/types/user.ts src/lib/users.ts
git commit -m "feat: add paid boolean to UserDoc"
```

---

### Task 2: TDD `toggleUserPaid` and `getAllUsers` helpers

**Files:**
- Create: `__tests__/lib/users-paid.test.ts`
- Modify: `src/lib/users.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/users-paid.test.ts`:
```ts
import firestore from "@react-native-firebase/firestore";
import { toggleUserPaid, getAllUsers } from "../../src/lib/users";

describe("toggleUserPaid", () => {
  it("updates the paid field on the user doc", async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ update: updateMock })),
      })),
    });

    await toggleUserPaid("user1", true);
    expect(updateMock).toHaveBeenCalledWith({ paid: true });
  });
});

describe("getAllUsers", () => {
  it("returns all user docs ordered by name", async () => {
    const users = [
      { id: "u1", data: () => ({ uid: "u1", name: "Alice", phoneNumber: "+1111", role: "participant", paid: false, createdAt: 1 }) },
      { id: "u2", data: () => ({ uid: "u2", name: "Bob", phoneNumber: "+2222", role: "admin", paid: true, createdAt: 2 }) },
    ];
    const getMock = jest.fn().mockResolvedValue({ docs: users });
    const orderByMock = jest.fn(() => ({ get: getMock }));
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ orderBy: orderByMock })),
    });

    const result = await getAllUsers();
    expect(orderByMock).toHaveBeenCalledWith("name", "asc");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Alice");
    expect(result[1].paid).toBe(true);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `npm test -- users-paid.test`
Expected: FAIL — `toggleUserPaid` not exported.

- [ ] **Step 3: Implement in `src/lib/users.ts`**

Append:
```ts
export async function toggleUserPaid(uid: string, paid: boolean): Promise<void> {
  await firestore().collection("users").doc(uid).update({ paid });
}

export async function getAllUsers(): Promise<UserDoc[]> {
  const snap = await firestore().collection("users").orderBy("name", "asc").get();
  return snap.docs.map((doc) => ({ ...(doc.data() as UserDoc), uid: doc.id }));
}
```

- [ ] **Step 4: Run, confirm pass**

Run: `npm test -- users-paid.test`
Expected: PASS (2 tests).

- [ ] **Step 5: TypeScript clean**

Run: `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add __tests__/lib/users-paid.test.ts src/lib/users.ts
git commit -m "feat: toggleUserPaid and getAllUsers helpers"
```

---

### Task 3: TDD `useAllUsers` hook

**Files:**
- Create: `__tests__/hooks/useAllUsers.test.tsx`, `src/hooks/useAllUsers.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/hooks/useAllUsers.test.tsx`:
```tsx
import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import firestore from "@react-native-firebase/firestore";
import { useAllUsers } from "../../src/hooks/useAllUsers";

describe("useAllUsers", () => {
  it("subscribes to users collection and updates on snapshot", async () => {
    let snapCb: ((snap: any) => void) | undefined;
    const onSnapshotMock = jest.fn((cb) => {
      snapCb = cb;
      return () => undefined;
    });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        orderBy: jest.fn(() => ({ onSnapshot: onSnapshotMock })),
      })),
    });

    const { result } = renderHook(() => useAllUsers());
    expect(result.current.loading).toBe(true);

    await act(async () => {
      snapCb?.({
        docs: [
          { id: "u1", data: () => ({ uid: "u1", name: "Alice", phoneNumber: "+1111", role: "participant", paid: false, createdAt: 1 }) },
        ],
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.users).toHaveLength(1);
    expect(result.current.users[0].name).toBe("Alice");
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `npm test -- useAllUsers.test`

- [ ] **Step 3: Implement `src/hooks/useAllUsers.ts`**

```ts
import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { UserDoc } from "../types/user";

export interface UseAllUsersState {
  users: UserDoc[];
  loading: boolean;
}

export function useAllUsers(): UseAllUsersState {
  const [state, setState] = useState<UseAllUsersState>({ users: [], loading: true });

  useEffect(() => {
    const unsub = firestore()
      .collection("users")
      .orderBy("name", "asc")
      .onSnapshot(
        (snap) => {
          if (!snap) return;
          const users = snap.docs.map((d) => ({ ...(d.data() as UserDoc), uid: d.id }));
          setState({ users, loading: false });
        },
        (err) => {
          console.error("useAllUsers error:", err);
          setState({ users: [], loading: false });
        }
      );
    return unsub;
  }, []);

  return state;
}
```

- [ ] **Step 4: Run, confirm pass**

Run: `npm test -- useAllUsers.test`

- [ ] **Step 5: Commit**

```bash
git add __tests__/hooks/useAllUsers.test.tsx src/hooks/useAllUsers.ts
git commit -m "feat: useAllUsers hook for admin user list"
```

---

### Task 4: Admin Community screen + participant Me screen + Firestore rules

**Files:**
- Modify: `app/(admin)/community.tsx`
- Modify: `app/(participant)/me.tsx`
- Modify: `firestore.rules`

- [ ] **Step 1: Replace `app/(admin)/community.tsx`**

Replace entire file with a user list screen:
- Uses `useAllUsers()` to get live user list
- Each row shows: name, phone number, role badge, paid status (green ✓ or red ✗)
- Tapping a row shows `Alert.alert` confirmation then calls `toggleUserPaid(uid, !currentPaid)`
- Style: `#FEE7F1` background, `#3B0764` text, white card rows, consistent with existing screens

- [ ] **Step 2: Update `app/(participant)/me.tsx`**

Add payment status badge:
- Import `useAuth` and `useUser` hooks
- Show "Paid ✓" (green) or "Unpaid" (gray) badge below the user's name
- Keep existing Sign Out button

- [ ] **Step 3: Update `firestore.rules`**

Change the users update rule to prevent participants from changing `role` or `paid`:

Current:
```
allow update: if isSelf(uid)
  && request.resource.data.role == resource.data.role;
```

Replace with:
```
allow update: if isAdmin() ||
  (isSelf(uid)
   && request.resource.data.role == resource.data.role
   && request.resource.data.paid == resource.data.paid);
```

This allows admins to update any user field, and participants to update themselves except `role` and `paid`.

- [ ] **Step 4: TypeScript clean + tests pass**

Run: `npx tsc --noEmit && npm test`

- [ ] **Step 5: Deploy rules**

Run: `firebase deploy --only firestore:rules`

- [ ] **Step 6: Commit**

```bash
git add app/(admin)/community.tsx app/(participant)/me.tsx firestore.rules
git commit -m "feat: admin community screen with payment toggle + participant paid badge"
```
