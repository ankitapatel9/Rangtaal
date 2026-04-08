# Rangtaal Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working Expo + Firebase mobile app where a user can sign in with their phone number via OTP, complete onboarding (enter name), and land on a role-based tab bar (participant or admin) with placeholder screens for every tab.

**Architecture:** Expo Dev Build (not Expo Go) + Expo Router + React Native Firebase (`@react-native-firebase/auth` + `@react-native-firebase/firestore`). User role lives on the user document in Firestore (`role: "participant" | "admin"`), and Expo Router's segment-based layouts swap between participant and admin tab bars at runtime. Strict TDD for `lib/` helpers and hooks. Manual smoke checks for screens (UI snapshot tests would add overhead without value at this stage).

**Tech stack:** Expo SDK 52+, TypeScript, Expo Router, @react-native-firebase/app, @react-native-firebase/auth, @react-native-firebase/firestore, EAS Build, Jest, React Native Testing Library, Firebase Local Emulator Suite

---

## File Structure

```
Rangtaal/
├── app/                            # Expo Router (file-based)
│   ├── _layout.tsx                 # Root layout: auth gate, redirects
│   ├── index.tsx                   # Splash → redirect
│   ├── (auth)/
│   │   ├── _layout.tsx             # Stack layout for auth screens
│   │   ├── login.tsx               # Phone number entry
│   │   ├── verify.tsx              # OTP verification
│   │   └── welcome.tsx             # Name entry / onboarding finish
│   ├── (participant)/
│   │   ├── _layout.tsx             # Participant tab bar (5 tabs)
│   │   ├── home.tsx                # Placeholder
│   │   ├── schedule.tsx            # Placeholder
│   │   ├── videos.tsx              # Placeholder
│   │   ├── chat.tsx                # Placeholder
│   │   └── me.tsx                  # Placeholder
│   └── (admin)/
│       ├── _layout.tsx             # Admin tab bar (5 tabs)
│       ├── home.tsx                # Placeholder
│       ├── community.tsx           # Placeholder
│       ├── finance.tsx             # Placeholder
│       ├── sessions.tsx            # Placeholder
│       └── profile.tsx             # Placeholder
├── src/
│   ├── lib/
│   │   ├── firebase.ts             # RNFirebase init
│   │   ├── auth.ts                 # signInWithPhone, confirmCode, signOut
│   │   └── users.ts                # createUserDoc, getUserDoc
│   ├── hooks/
│   │   ├── useAuth.ts              # Subscribe to auth state
│   │   └── useUser.ts              # Subscribe to user document
│   └── types/
│       └── user.ts                 # User type definitions
├── functions/                      # Cloud Functions (empty stub)
│   ├── src/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── __tests__/
│   ├── lib/
│   │   ├── auth.test.ts
│   │   └── users.test.ts
│   └── hooks/
│       ├── useAuth.test.ts
│       └── useUser.test.ts
├── firestore.rules                 # Initial security rules
├── firestore.indexes.json          # (empty for now)
├── firebase.json                   # Firebase project config
├── .firebaserc                     # Project alias
├── app.json                        # Expo config
├── eas.json                        # EAS Build profiles
├── package.json
├── tsconfig.json
├── babel.config.js
├── jest.config.js
├── jest.setup.ts                   # Test environment setup
└── .gitignore
```

---

## Task 1: Bootstrap Expo TypeScript project in the existing repo

**Files:**
- Create: `package.json`, `tsconfig.json`, `app.json`, `babel.config.js`, `index.ts`, `.gitignore`

- [ ] **Step 1: Initialize an Expo TypeScript project in the current directory**

Run from `/Users/ankipatel/Documents/GitHub/Rangtaal`:
```bash
npx create-expo-app@latest . --template blank-typescript
```
Expected: Expo scaffolds files into the existing directory. If it complains about non-empty directory (because of `.git` and `docs/`), rerun with `--no-install` and accept the prompt to merge.

- [ ] **Step 2: Verify the dev server boots**

Run:
```bash
npm install
npx expo start --no-dev --max-warnings 0
```
Stop with `Ctrl+C` once you see "Metro waiting on..." in the terminal.

- [ ] **Step 3: Commit the bootstrap**

```bash
git add package.json package-lock.json tsconfig.json app.json babel.config.js index.ts App.tsx assets .gitignore
git commit -m "chore: bootstrap Expo TypeScript project"
```

---

## Task 2: Replace default App with Expo Router

**Files:**
- Create: `app/_layout.tsx`, `app/index.tsx`
- Modify: `package.json`, `app.json`
- Delete: `App.tsx`

- [ ] **Step 1: Install Expo Router and its peers**

Run:
```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

- [ ] **Step 2: Configure entry point in `package.json`**

Edit `package.json` and change the `"main"` field to:
```json
"main": "expo-router/entry"
```

- [ ] **Step 3: Add the router scheme to `app.json`**

Edit `app.json` and inside the `"expo"` object add:
```json
"scheme": "rangtaal",
"plugins": ["expo-router"]
```

- [ ] **Step 4: Create the root layout `app/_layout.tsx`**

```tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 5: Create the entry screen `app/index.tsx`**

```tsx
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Rangtaal — Foundation</Text>
    </View>
  );
}
```

- [ ] **Step 6: Delete the legacy `App.tsx`**

Run:
```bash
rm App.tsx
```

- [ ] **Step 7: Verify it boots**

Run:
```bash
npx expo start
```
Open the project in Expo Go on your phone or simulator. You should see "Rangtaal — Foundation". Stop the server.

- [ ] **Step 8: Commit**

```bash
git add app/ package.json app.json
git rm App.tsx
git commit -m "feat: switch to expo-router with placeholder index"
```

---

## Task 3: Set up the EAS Dev Build (required for native Firebase)

**Files:**
- Create: `eas.json`
- Modify: `app.json`

> **Why:** `@react-native-firebase/auth` includes native code, which means Expo Go won't work. We need a custom Dev Build via EAS.

- [ ] **Step 1: Install EAS CLI globally if not already**

Run:
```bash
npm install -g eas-cli
eas --version
```
Expected: a version number prints.

- [ ] **Step 2: Log in to your Expo account**

Run:
```bash
eas login
```
If you don't have an Expo account, create one at expo.dev first.

- [ ] **Step 3: Initialize EAS configuration**

Run:
```bash
eas build:configure
```
Choose `All` for platforms when prompted. This creates `eas.json`.

- [ ] **Step 4: Add a `development` build profile to `eas.json`**

Replace the contents of `eas.json` with:
```json
{
  "cli": { "version": ">= 5.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": { "production": {} }
}
```

- [ ] **Step 5: Set the bundle identifier in `app.json`**

Edit `app.json` inside the `"expo"` object:
```json
"ios": { "bundleIdentifier": "com.rangtaal.app" },
"android": { "package": "com.rangtaal.app" }
```

- [ ] **Step 6: Install expo-dev-client**

Run:
```bash
npx expo install expo-dev-client
```

- [ ] **Step 7: Commit**

```bash
git add eas.json app.json package.json package-lock.json
git commit -m "chore: configure EAS Dev Build"
```

> **Note for the engineer:** You'll trigger the actual build in Task 7 once Firebase config files exist. Skipping ahead and building now would fail because Firebase isn't wired in yet.

---

## Task 4: Create the Firebase project and apps via CLI

> Most of this task uses `firebase-tools` and `gcloud`. Only the steps marked **(Console)** require the browser, and each is a single click or form — they can't be automated.

- [ ] **Step 1: Install the Firebase CLI and gcloud (if not already)**

```bash
npm install -g firebase-tools
firebase --version

brew install --cask google-cloud-sdk 2>/dev/null || true
gcloud --version
```
Expected: both print a version. If you already have these, the commands are no-ops.

- [ ] **Step 2: Log in to both CLIs**

```bash
firebase login
gcloud auth login
gcloud auth application-default login
```
Each opens a browser for OAuth. Accept.

- [ ] **Step 3: Create the Firebase project**

```bash
firebase projects:create rangtaal-prod --display-name "Rangtaal"
```
Expected: `✔ Your Google Cloud Platform project "Rangtaal" is ready.`
If the ID is taken, append a suffix (e.g., `rangtaal-prod-2026`) and use that in every subsequent command and in `.firebaserc` (Task 21).

- [ ] **Step 4: Point the CLI at the new project**

```bash
firebase use rangtaal-prod
gcloud config set project rangtaal-prod
```

- [ ] **Step 5: Create the Firestore database via gcloud**

```bash
gcloud firestore databases create \
  --location=us-central1 \
  --type=firestore-native \
  --project=rangtaal-prod
```
Expected: `Successfully created the Firestore database`. (`us-central1` is the closest multi-region to Roselle, IL.)

- [ ] **Step 6: Register the iOS app and capture its App ID**

```bash
firebase apps:create IOS "Rangtaal iOS" \
  --bundle-id com.rangtaal.app \
  --project rangtaal-prod
```
Expected: prints `App ID: 1:<numbers>:ios:<hash>`. Copy that App ID — you'll need it in Step 8.

- [ ] **Step 7: Register the Android app and capture its App ID**

```bash
firebase apps:create ANDROID "Rangtaal Android" \
  --package-name com.rangtaal.app \
  --project rangtaal-prod
```
Expected: prints `App ID: 1:<numbers>:android:<hash>`. Copy it — you'll need it in Step 9.

- [ ] **Step 8: Download `GoogleService-Info.plist` directly into the project root**

Replace `<IOS_APP_ID>` with the iOS App ID from Step 6:
```bash
cd /Users/ankipatel/Documents/GitHub/Rangtaal
firebase apps:sdkconfig IOS <IOS_APP_ID> --out GoogleService-Info.plist
```
Expected: file is written to the project root.

- [ ] **Step 9: Download `google-services.json` directly into the project root**

Replace `<ANDROID_APP_ID>` with the Android App ID from Step 7:
```bash
firebase apps:sdkconfig ANDROID <ANDROID_APP_ID> --out google-services.json
```
Expected: file is written to the project root.

- [ ] **Step 10: Enable Phone Authentication (Console — one click)**

Open https://console.firebase.google.com/project/rangtaal-prod/authentication/providers and click **Phone → Enable → Save**. (No public API exposes this toggle, so this is the one unavoidable click.)

- [ ] **Step 11: Add a test phone number (Console — one form)**

On the same page, scroll to **Phone numbers for testing → Add phone number**:
- Phone: `+1 555-555-5555`
- Code: `123456`

This lets you sign in during development without sending real SMS.

---

## Task 5: Wire the Firebase config files into Expo

**Files:**
- Modify: `.gitignore`, `app.json`

> Task 4 already dropped `GoogleService-Info.plist` and `google-services.json` into the project root. This task just gitignores them and tells Expo where they are.

- [ ] **Step 1: Add them to `.gitignore`**

Append to `.gitignore`:
```
# Firebase config (do not commit — contains project secrets)
GoogleService-Info.plist
google-services.json
```

- [ ] **Step 2: Reference them in `app.json`**

Edit `app.json` and update the iOS/Android sections:
```json
"ios": {
  "bundleIdentifier": "com.rangtaal.app",
  "googleServicesFile": "./GoogleService-Info.plist"
},
"android": {
  "package": "com.rangtaal.app",
  "googleServicesFile": "./google-services.json"
}
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore app.json
git commit -m "chore: gitignore firebase config and wire into expo"
```

---

## Task 6: Install React Native Firebase

**Files:**
- Modify: `package.json`, `app.json`

- [ ] **Step 1: Install the core + auth + firestore packages**

Run:
```bash
npx expo install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore
```

- [ ] **Step 2: Add the Firebase plugins to `app.json`**

Edit `app.json` `"plugins"` array:
```json
"plugins": [
  "expo-router",
  "@react-native-firebase/app",
  [
    "expo-build-properties",
    {
      "ios": { "useFrameworks": "static" }
    }
  ]
]
```

- [ ] **Step 3: Install expo-build-properties (required for the static frameworks workaround)**

Run:
```bash
npx expo install expo-build-properties
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "feat: add react-native-firebase auth + firestore"
```

---

## Task 7: Build and install the Dev Client

**Files:** None (just builds and installs).

- [ ] **Step 1: Trigger an iOS Dev Build**

Run:
```bash
eas build --profile development --platform ios
```
Wait for the build to complete (10–20 minutes). When done, EAS will print an install URL.

- [ ] **Step 2: Install the build on your iPhone**

Open the install URL on your iPhone in Safari and tap **Install**. Trust the developer profile under **Settings → General → VPN & Device Management** if prompted.

- [ ] **Step 3: Start the dev server**

Run:
```bash
npx expo start --dev-client
```

- [ ] **Step 4: Open the app on your phone**

Tap the Rangtaal app icon. It should connect to the dev server and show "Rangtaal — Foundation".

- [ ] **Step 5: Repeat for Android (optional for now)**

```bash
eas build --profile development --platform android
```
Install the resulting APK on an Android device or emulator.

> **Note:** No commit here — only artifacts changed, and they're not in the repo.

---

## Task 8: Set up Jest + React Native Testing Library

**Files:**
- Create: `jest.config.js`, `jest.setup.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Jest dependencies**

Run:
```bash
npm install --save-dev jest @types/jest jest-expo @testing-library/react-native ts-jest
```

- [ ] **Step 2: Create `jest.config.js`**

```js
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@react-native-firebase/.*|expo-router|expo-modules-core)"
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  testMatch: ["**/__tests__/**/*.test.(ts|tsx)"]
};
```

- [ ] **Step 3: Create `jest.setup.ts`**

```ts
jest.mock("@react-native-firebase/auth", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    onAuthStateChanged: jest.fn(),
    signInWithPhoneNumber: jest.fn(),
    signOut: jest.fn()
  }))
}));

jest.mock("@react-native-firebase/firestore", () => {
  const firestoreMock: any = jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        get: jest.fn(),
        onSnapshot: jest.fn()
      }))
    }))
  }));
  firestoreMock.FieldValue = { serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP") };
  return { __esModule: true, default: firestoreMock };
});
```

- [ ] **Step 4: Add the test script to `package.json`**

In `package.json` `"scripts"`:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Run the empty test suite to confirm Jest boots**

Run:
```bash
npm test
```
Expected: `No tests found, exiting with code 1` (this is OK — Jest is wired up but we haven't written tests yet).

- [ ] **Step 6: Commit**

```bash
git add jest.config.js jest.setup.ts package.json package-lock.json
git commit -m "chore: configure jest with react-native-firebase mocks"
```

---

## Task 9: Define the User type

**Files:**
- Create: `src/types/user.ts`

- [ ] **Step 1: Create `src/types/user.ts`**

```ts
export type UserRole = "participant" | "admin";

export interface UserDoc {
  uid: string;
  name: string;
  phoneNumber: string;
  role: UserRole;
  createdAt: number;
}

export interface NewUserInput {
  uid: string;
  name: string;
  phoneNumber: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/user.ts
git commit -m "feat: define User type"
```

---

## Task 10: TDD `createUserDoc` helper

**Files:**
- Create: `__tests__/lib/users.test.ts`, `src/lib/users.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/users.test.ts`:
```ts
import firestore from "@react-native-firebase/firestore";
import { createUserDoc } from "../../src/lib/users";

describe("createUserDoc", () => {
  it("writes a user document with the participant role by default", async () => {
    const setMock = jest.fn().mockResolvedValue(undefined);
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ set: setMock }))
      }))
    });

    await createUserDoc({
      uid: "abc123",
      name: "Aryan",
      phoneNumber: "+15555555555"
    });

    expect(setMock).toHaveBeenCalledWith({
      uid: "abc123",
      name: "Aryan",
      phoneNumber: "+15555555555",
      role: "participant",
      createdAt: "SERVER_TIMESTAMP"
    });
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:
```bash
npm test -- users.test.ts
```
Expected: `Cannot find module '../../src/lib/users'`

- [ ] **Step 3: Implement `src/lib/users.ts`**

```ts
import firestore from "@react-native-firebase/firestore";
import { NewUserInput } from "../types/user";

export async function createUserDoc(input: NewUserInput): Promise<void> {
  const ref = firestore().collection("users").doc(input.uid);
  await ref.set({
    uid: input.uid,
    name: input.name,
    phoneNumber: input.phoneNumber,
    role: "participant",
    createdAt: firestore.FieldValue.serverTimestamp()
  });
}
```

- [ ] **Step 4: Re-run the test**

Run:
```bash
npm test -- users.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add __tests__/lib/users.test.ts src/lib/users.ts
git commit -m "feat: createUserDoc helper with default participant role"
```

---

## Task 11: TDD `getUserDoc` helper

**Files:**
- Modify: `__tests__/lib/users.test.ts`, `src/lib/users.ts`

- [ ] **Step 1: Add the failing test**

Append to `__tests__/lib/users.test.ts`:
```ts
import { getUserDoc } from "../../src/lib/users";

describe("getUserDoc", () => {
  it("returns the user doc when present", async () => {
    const data = {
      uid: "abc123",
      name: "Aryan",
      phoneNumber: "+15555555555",
      role: "admin",
      createdAt: 1700000000
    };
    const getMock = jest.fn().mockResolvedValue({ exists: true, data: () => data });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ doc: jest.fn(() => ({ get: getMock })) }))
    });

    const result = await getUserDoc("abc123");
    expect(result).toEqual(data);
  });

  it("returns null when the user doc does not exist", async () => {
    const getMock = jest.fn().mockResolvedValue({ exists: false });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ doc: jest.fn(() => ({ get: getMock })) }))
    });

    const result = await getUserDoc("missing");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:
```bash
npm test -- users.test.ts
```
Expected: `getUserDoc is not exported`.

- [ ] **Step 3: Implement `getUserDoc`**

Append to `src/lib/users.ts`:
```ts
import { UserDoc } from "../types/user";

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await firestore().collection("users").doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() as UserDoc;
}
```

- [ ] **Step 4: Re-run the test**

Run:
```bash
npm test -- users.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add __tests__/lib/users.test.ts src/lib/users.ts
git commit -m "feat: getUserDoc helper"
```

---

## Task 12: TDD `signInWithPhone` and `confirmCode` helpers

**Files:**
- Create: `__tests__/lib/auth.test.ts`, `src/lib/auth.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/auth.test.ts`:
```ts
import auth from "@react-native-firebase/auth";
import { signInWithPhone, confirmCode, signOut } from "../../src/lib/auth";

describe("signInWithPhone", () => {
  it("calls signInWithPhoneNumber with the E.164 number", async () => {
    const signInMock = jest.fn().mockResolvedValue({ verificationId: "VID" });
    (auth as unknown as jest.Mock).mockReturnValue({
      signInWithPhoneNumber: signInMock
    });

    const result = await signInWithPhone("+15555555555");
    expect(signInMock).toHaveBeenCalledWith("+15555555555");
    expect(result).toEqual({ verificationId: "VID" });
  });
});

describe("confirmCode", () => {
  it("calls confirm on the confirmation result", async () => {
    const confirmMock = jest.fn().mockResolvedValue({ user: { uid: "u1" } });
    const confirmation = { confirm: confirmMock };

    const result = await confirmCode(confirmation as any, "123456");
    expect(confirmMock).toHaveBeenCalledWith("123456");
    expect(result).toEqual({ user: { uid: "u1" } });
  });
});

describe("signOut", () => {
  it("calls firebase auth().signOut", async () => {
    const signOutMock = jest.fn().mockResolvedValue(undefined);
    (auth as unknown as jest.Mock).mockReturnValue({ signOut: signOutMock });

    await signOut();
    expect(signOutMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:
```bash
npm test -- auth.test.ts
```
Expected: module not found.

- [ ] **Step 3: Implement `src/lib/auth.ts`**

```ts
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";

export type ConfirmationResult = FirebaseAuthTypes.ConfirmationResult;

export async function signInWithPhone(phoneE164: string): Promise<ConfirmationResult> {
  return auth().signInWithPhoneNumber(phoneE164);
}

export async function confirmCode(
  confirmation: ConfirmationResult,
  code: string
): Promise<FirebaseAuthTypes.UserCredential> {
  return confirmation.confirm(code);
}

export async function signOut(): Promise<void> {
  await auth().signOut();
}
```

- [ ] **Step 4: Re-run the test**

Run:
```bash
npm test -- auth.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add __tests__/lib/auth.test.ts src/lib/auth.ts
git commit -m "feat: phone auth helpers (signInWithPhone, confirmCode, signOut)"
```

---

## Task 13: TDD `useAuth` hook

**Files:**
- Create: `__tests__/hooks/useAuth.test.tsx`, `src/hooks/useAuth.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/hooks/useAuth.test.tsx`:
```tsx
import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import auth from "@react-native-firebase/auth";
import { useAuth } from "../../src/hooks/useAuth";

describe("useAuth", () => {
  it("starts as loading and emits null when unauthenticated", async () => {
    let listener: ((u: any) => void) | undefined;
    const onAuthStateChangedMock = jest.fn((cb) => {
      listener = cb;
      return () => undefined;
    });
    (auth as unknown as jest.Mock).mockReturnValue({
      onAuthStateChanged: onAuthStateChangedMock
    });

    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);

    await act(async () => {
      listener?.(null);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("emits the user when authenticated", async () => {
    let listener: ((u: any) => void) | undefined;
    (auth as unknown as jest.Mock).mockReturnValue({
      onAuthStateChanged: (cb: any) => {
        listener = cb;
        return () => undefined;
      }
    });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      listener?.({ uid: "abc", phoneNumber: "+15555555555" });
    });

    expect(result.current.user).toEqual({ uid: "abc", phoneNumber: "+15555555555" });
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run:
```bash
npm test -- useAuth.test
```
Expected: module not found.

- [ ] **Step 3: Implement `src/hooks/useAuth.ts`**

```ts
import { useEffect, useState } from "react";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";

export interface AuthState {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const unsub = auth().onAuthStateChanged((u) => {
      setState({ user: u, loading: false });
    });
    return unsub;
  }, []);

  return state;
}
```

- [ ] **Step 4: Re-run**

Run:
```bash
npm test -- useAuth.test
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add __tests__/hooks/useAuth.test.tsx src/hooks/useAuth.ts
git commit -m "feat: useAuth hook with loading + user state"
```

---

## Task 14: TDD `useUser` hook (subscribes to user document)

**Files:**
- Create: `__tests__/hooks/useUser.test.tsx`, `src/hooks/useUser.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/hooks/useUser.test.tsx`:
```tsx
import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import firestore from "@react-native-firebase/firestore";
import { useUser } from "../../src/hooks/useUser";

describe("useUser", () => {
  it("returns null while loading and updates when snapshot fires", async () => {
    let snapCb: ((snap: any) => void) | undefined;
    const onSnapshotMock = jest.fn((cb) => {
      snapCb = cb;
      return () => undefined;
    });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ onSnapshot: onSnapshotMock }))
      }))
    });

    const { result } = renderHook(() => useUser("abc"));
    expect(result.current.loading).toBe(true);

    await act(async () => {
      snapCb?.({
        exists: true,
        data: () => ({
          uid: "abc",
          name: "Aryan",
          phoneNumber: "+15555555555",
          role: "admin",
          createdAt: 1
        })
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user?.role).toBe("admin");
  });

  it("returns null user when uid is undefined", () => {
    const { result } = renderHook(() => useUser(undefined));
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run:
```bash
npm test -- useUser.test
```
Expected: module not found.

- [ ] **Step 3: Implement `src/hooks/useUser.ts`**

```ts
import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { UserDoc } from "../types/user";

export interface UserState {
  user: UserDoc | null;
  loading: boolean;
}

export function useUser(uid: string | undefined): UserState {
  const [state, setState] = useState<UserState>({ user: null, loading: !!uid });

  useEffect(() => {
    if (!uid) {
      setState({ user: null, loading: false });
      return;
    }
    const unsub = firestore()
      .collection("users")
      .doc(uid)
      .onSnapshot((snap) => {
        if (snap.exists) {
          setState({ user: snap.data() as UserDoc, loading: false });
        } else {
          setState({ user: null, loading: false });
        }
      });
    return unsub;
  }, [uid]);

  return state;
}
```

- [ ] **Step 4: Re-run**

Run:
```bash
npm test -- useUser.test
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add __tests__/hooks/useUser.test.tsx src/hooks/useUser.ts
git commit -m "feat: useUser hook subscribing to user doc"
```

---

## Task 15: Build the auth gate in the root layout

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/index.tsx`

- [ ] **Step 1: Replace `app/_layout.tsx` with the auth-gated layout**

```tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../src/hooks/useAuth";
import { useUser } from "../src/hooks/useUser";

export default function RootLayout() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { user: userDoc, loading: userLoading } = useUser(authUser?.uid);
  const segments = useSegments();
  const router = useRouter();

  const loading = authLoading || (authUser && userLoading);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inParticipantGroup = segments[0] === "(participant)";
    const inAdminGroup = segments[0] === "(admin)";

    if (!authUser) {
      if (!inAuthGroup) router.replace("/(auth)/login");
      return;
    }

    if (authUser && !userDoc) {
      if (segments[1] !== "welcome") router.replace("/(auth)/welcome");
      return;
    }

    if (userDoc?.role === "admin") {
      if (!inAdminGroup) router.replace("/(admin)/home");
    } else {
      if (!inParticipantGroup) router.replace("/(participant)/home");
    }
  }, [authUser, userDoc, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Simplify `app/index.tsx` to a redirect**

```tsx
import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx app/index.tsx
git commit -m "feat: auth gate in root layout with role-based routing"
```

---

## Task 16: Create the auth stack and login screen

**Files:**
- Create: `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`

- [ ] **Step 1: Create the auth stack layout**

Create `app/(auth)/_layout.tsx`:
```tsx
import { Stack } from "expo-router";

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Create the login screen**

Create `app/(auth)/login.tsx`:
```tsx
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { signInWithPhone, ConfirmationResult } from "../../src/lib/auth";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSendOTP() {
    if (phone.length < 10) {
      Alert.alert("Invalid phone", "Enter a 10-digit US phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const e164 = `+1${phone.replace(/\D/g, "")}`;
      const confirmation: ConfirmationResult = await signInWithPhone(e164);
      router.push({
        pathname: "/(auth)/verify",
        params: { verificationId: confirmation.verificationId ?? "" }
      });
      // Stash the confirmation in a module-scoped slot for verify.tsx
      pendingConfirmation = confirmation;
    } catch (err: any) {
      Alert.alert("Sign-in failed", err?.message ?? "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rangtaal</Text>
      <Text style={styles.tagline}>
        Step into the circle. Join the most vibrant Garba community.
      </Text>
      <View style={styles.inputRow}>
        <Text style={styles.countryCode}>+1</Text>
        <TextInput
          style={styles.input}
          placeholder="(555) 555-5555"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          maxLength={14}
        />
      </View>
      <TouchableOpacity
        style={[styles.button, submitting && { opacity: 0.5 }]}
        onPress={handleSendOTP}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>{submitting ? "Sending..." : "Send OTP →"}</Text>
      </TouchableOpacity>
    </View>
  );
}

export let pendingConfirmation: ConfirmationResult | null = null;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#FEE7F1" },
  title: { fontSize: 36, fontWeight: "700", color: "#3B0764", textAlign: "center" },
  tagline: { fontSize: 14, color: "#3B0764", textAlign: "center", marginVertical: 16 },
  inputRow: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    marginVertical: 12
  },
  countryCode: { fontSize: 16, marginRight: 8, color: "#3B0764" },
  input: { flex: 1, height: 48, fontSize: 16 },
  button: {
    backgroundColor: "#FACC15",
    borderRadius: 32,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12
  },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#3B0764" }
});
```

- [ ] **Step 3: Commit**

```bash
git add app/(auth)/_layout.tsx app/(auth)/login.tsx
git commit -m "feat: phone OTP login screen"
```

---

## Task 17: Create the OTP verification screen

**Files:**
- Create: `app/(auth)/verify.tsx`

- [ ] **Step 1: Create `app/(auth)/verify.tsx`**

```tsx
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { confirmCode } from "../../src/lib/auth";
import { pendingConfirmation } from "./login";

export default function VerifyScreen() {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleVerify() {
    if (code.length !== 6) {
      Alert.alert("Invalid code", "Enter the 6-digit code from your text.");
      return;
    }
    if (!pendingConfirmation) {
      Alert.alert("Session expired", "Please request a new code.");
      router.replace("/(auth)/login");
      return;
    }
    setSubmitting(true);
    try {
      await confirmCode(pendingConfirmation, code);
      // The auth gate in root layout will route the user from here.
    } catch (err: any) {
      Alert.alert("Verification failed", err?.message ?? "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter the code</Text>
      <Text style={styles.subtitle}>We sent a 6-digit code to your phone.</Text>
      <TextInput
        style={styles.input}
        placeholder="123456"
        keyboardType="number-pad"
        value={code}
        onChangeText={setCode}
        maxLength={6}
      />
      <TouchableOpacity
        style={[styles.button, submitting && { opacity: 0.5 }]}
        onPress={handleVerify}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>{submitting ? "Verifying..." : "Verify"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#FEE7F1" },
  title: { fontSize: 28, fontWeight: "700", color: "#3B0764", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#3B0764", textAlign: "center", marginVertical: 12 },
  input: {
    backgroundColor: "white",
    borderRadius: 12,
    height: 56,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 8,
    marginVertical: 16
  },
  button: { backgroundColor: "#FACC15", borderRadius: 32, paddingVertical: 16, alignItems: "center" },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#3B0764" }
});
```

- [ ] **Step 2: Commit**

```bash
git add app/(auth)/verify.tsx
git commit -m "feat: OTP verification screen"
```

---

## Task 18: Create the welcome / name entry screen

**Files:**
- Create: `app/(auth)/welcome.tsx`

- [ ] **Step 1: Create `app/(auth)/welcome.tsx`**

```tsx
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import auth from "@react-native-firebase/auth";
import { createUserDoc } from "../../src/lib/users";

export default function WelcomeScreen() {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleFinish() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert("Name required", "Please enter your name to continue.");
      return;
    }
    const current = auth().currentUser;
    if (!current) {
      Alert.alert("Not signed in", "Please sign in again.");
      return;
    }
    setSubmitting(true);
    try {
      await createUserDoc({
        uid: current.uid,
        name: trimmed,
        phoneNumber: current.phoneNumber ?? ""
      });
      // The auth gate routes to participant home automatically.
    } catch (err: any) {
      Alert.alert("Could not save", err?.message ?? "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Rangtaal!</Text>
      <Text style={styles.subtitle}>Let's get you started. How should your community address you?</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        value={name}
        onChangeText={setName}
      />
      <TouchableOpacity
        style={[styles.button, submitting && { opacity: 0.5 }]}
        onPress={handleFinish}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>{submitting ? "Saving..." : "Finish Onboarding →"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#FEE7F1" },
  title: { fontSize: 28, fontWeight: "700", color: "#3B0764", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#3B0764", textAlign: "center", marginVertical: 12 },
  input: { backgroundColor: "white", borderRadius: 12, height: 48, paddingHorizontal: 16, marginVertical: 16, fontSize: 16 },
  button: { backgroundColor: "#FACC15", borderRadius: 32, paddingVertical: 16, alignItems: "center" },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#3B0764" }
});
```

- [ ] **Step 2: Commit**

```bash
git add app/(auth)/welcome.tsx
git commit -m "feat: welcome / name entry onboarding screen"
```

---

## Task 19: Create the participant tab bar layout + 5 placeholder screens

**Files:**
- Create: `app/(participant)/_layout.tsx`, `app/(participant)/home.tsx`, `app/(participant)/schedule.tsx`, `app/(participant)/videos.tsx`, `app/(participant)/chat.tsx`, `app/(participant)/me.tsx`

- [ ] **Step 1: Install the icon library**

Run:
```bash
npx expo install @expo/vector-icons
```

- [ ] **Step 2: Create `app/(participant)/_layout.tsx`**

```tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ParticipantLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#3B0764",
        tabBarInactiveTintColor: "#9CA3AF"
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="schedule"
        options={{ title: "Schedule", tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="videos"
        options={{ title: "Videos", tabBarIcon: ({ color, size }) => <Ionicons name="play-circle" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: "Chat", tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="me"
        options={{ title: "Me", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 3: Create the 5 participant placeholder screens**

Create each of the following files with the matching content. Each shows the tab name and a "Phase 1 placeholder" message.

`app/(participant)/home.tsx`:
```tsx
import { Text, View, StyleSheet } from "react-native";
export default function ParticipantHome() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Home</Text>
      <Text style={styles.s}>Phase 1 placeholder. Real content lands in Phase 2.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#FEE7F1" },
  t: { fontSize: 28, fontWeight: "700", color: "#3B0764" },
  s: { fontSize: 14, color: "#3B0764", marginTop: 8, textAlign: "center" }
});
```

`app/(participant)/schedule.tsx`:
```tsx
import { Text, View, StyleSheet } from "react-native";
export default function ParticipantSchedule() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Schedule</Text>
      <Text style={styles.s}>Phase 1 placeholder. Calendar arrives in Phase 2.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#FEE7F1" },
  t: { fontSize: 28, fontWeight: "700", color: "#3B0764" },
  s: { fontSize: 14, color: "#3B0764", marginTop: 8, textAlign: "center" }
});
```

`app/(participant)/videos.tsx`:
```tsx
import { Text, View, StyleSheet } from "react-native";
export default function ParticipantVideos() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Videos</Text>
      <Text style={styles.s}>Phase 1 placeholder. Tutorial library arrives in Phase 5.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#FEE7F1" },
  t: { fontSize: 28, fontWeight: "700", color: "#3B0764" },
  s: { fontSize: 14, color: "#3B0764", marginTop: 8, textAlign: "center" }
});
```

`app/(participant)/chat.tsx`:
```tsx
import { Text, View, StyleSheet } from "react-native";
export default function ParticipantChat() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Chat</Text>
      <Text style={styles.s}>Phase 1 placeholder. Community chat arrives in Phase 6.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#FEE7F1" },
  t: { fontSize: 28, fontWeight: "700", color: "#3B0764" },
  s: { fontSize: 14, color: "#3B0764", marginTop: 8, textAlign: "center" }
});
```

`app/(participant)/me.tsx`:
```tsx
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { signOut } from "../../src/lib/auth";
export default function ParticipantMe() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Me</Text>
      <Text style={styles.s}>Phase 1 placeholder.</Text>
      <TouchableOpacity style={styles.btn} onPress={() => signOut()}>
        <Text style={styles.btnText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#FEE7F1" },
  t: { fontSize: 28, fontWeight: "700", color: "#3B0764" },
  s: { fontSize: 14, color: "#3B0764", marginTop: 8, textAlign: "center" },
  btn: { marginTop: 24, backgroundColor: "#FACC15", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 32 },
  btnText: { color: "#3B0764", fontWeight: "700" }
});
```

- [ ] **Step 4: Commit**

```bash
git add app/(participant)/
git commit -m "feat: participant tab bar with 5 placeholder screens"
```

---

## Task 20: Create the admin tab bar layout + 5 placeholder screens

**Files:**
- Create: `app/(admin)/_layout.tsx`, `app/(admin)/home.tsx`, `app/(admin)/community.tsx`, `app/(admin)/finance.tsx`, `app/(admin)/sessions.tsx`, `app/(admin)/profile.tsx`

- [ ] **Step 1: Create `app/(admin)/_layout.tsx`**

```tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#3B0764",
        tabBarInactiveTintColor: "#9CA3AF"
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="community"
        options={{ title: "Community", tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="finance"
        options={{ title: "Finance", tabBarIcon: ({ color, size }) => <Ionicons name="wallet" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="sessions"
        options={{ title: "Sessions", tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Create the 5 admin placeholder screens**

`app/(admin)/home.tsx`:
```tsx
import { Text, View, StyleSheet } from "react-native";
export default function AdminHome() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Admin Home</Text>
      <Text style={styles.s}>Phase 1 placeholder.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#FEE7F1" },
  t: { fontSize: 28, fontWeight: "700", color: "#3B0764" },
  s: { fontSize: 14, color: "#3B0764", marginTop: 8, textAlign: "center" }
});
```

`app/(admin)/community.tsx`:
```tsx
import { Text, View, StyleSheet } from "react-native";
export default function AdminCommunity() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Community</Text>
      <Text style={styles.s}>Phase 1 placeholder. Participant management arrives in Phase 3.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#FEE7F1" },
  t: { fontSize: 28, fontWeight: "700", color: "#3B0764" },
  s: { fontSize: 14, color: "#3B0764", marginTop: 8, textAlign: "center" }
});
```

`app/(admin)/finance.tsx`:
```tsx
import { Text, View, StyleSheet } from "react-native";
export default function AdminFinance() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Finance</Text>
      <Text style={styles.s}>Phase 1 placeholder. Profit & Loss arrives in Phase 7.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#FEE7F1" },
  t: { fontSize: 28, fontWeight: "700", color: "#3B0764" },
  s: { fontSize: 14, color: "#3B0764", marginTop: 8, textAlign: "center" }
});
```

`app/(admin)/sessions.tsx`:
```tsx
import { Text, View, StyleSheet } from "react-native";
export default function AdminSessions() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Sessions</Text>
      <Text style={styles.s}>Phase 1 placeholder. Admin calendar arrives in Phase 2.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#FEE7F1" },
  t: { fontSize: 28, fontWeight: "700", color: "#3B0764" },
  s: { fontSize: 14, color: "#3B0764", marginTop: 8, textAlign: "center" }
});
```

`app/(admin)/profile.tsx`:
```tsx
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { signOut } from "../../src/lib/auth";
export default function AdminProfile() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Admin Profile</Text>
      <Text style={styles.s}>Phase 1 placeholder.</Text>
      <TouchableOpacity style={styles.btn} onPress={() => signOut()}>
        <Text style={styles.btnText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#FEE7F1" },
  t: { fontSize: 28, fontWeight: "700", color: "#3B0764" },
  s: { fontSize: 14, color: "#3B0764", marginTop: 8, textAlign: "center" },
  btn: { marginTop: 24, backgroundColor: "#FACC15", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 32 },
  btnText: { color: "#3B0764", fontWeight: "700" }
});
```

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/
git commit -m "feat: admin tab bar with 5 placeholder screens"
```

---

## Task 21: Initial Firestore security rules

**Files:**
- Create: `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`

- [ ] **Step 1: Create `firestore.rules`**

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
  }
}
```

> **Note:** The `create` rule pins new users to `participant`. Admins are promoted manually via the Firebase console for now (Phase 7 will add a UI).

- [ ] **Step 2: Create `firestore.indexes.json`**

```json
{ "indexes": [], "fieldOverrides": [] }
```

- [ ] **Step 3: Create `firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

- [ ] **Step 4: Create `.firebaserc`**

Replace `<your-firebase-project-id>` with the project ID from the Firebase Console (Project Settings → General):
```json
{
  "projects": {
    "default": "<your-firebase-project-id>"
  }
}
```

- [ ] **Step 5: Deploy the rules**

Run:
```bash
firebase deploy --only firestore:rules
```
Expected: `✔ Deploy complete!` (Firebase CLI and login were already set up in Task 4.)

- [ ] **Step 6: Commit**

```bash
git add firestore.rules firestore.indexes.json firebase.json .firebaserc
git commit -m "feat: initial firestore security rules (users only, role-pinned)"
```

---

## Task 22: Manual smoke test the full auth flow

> No code changes — verify the app works end-to-end on a real device.

- [ ] **Step 1: Start the dev server**

```bash
npx expo start --dev-client
```

- [ ] **Step 2: Open the app on your phone**

You should land on the **Login** screen.

- [ ] **Step 3: Enter the test phone number**

Type `5555555555`. Tap **Send OTP →**. You should land on the verify screen.

- [ ] **Step 4: Enter the test OTP code**

Type `123456`. Tap **Verify**. You should land on the welcome screen (since you don't have a user document yet).

- [ ] **Step 5: Enter your name**

Type any name and tap **Finish Onboarding →**. You should land on the **Participant Home** placeholder.

- [ ] **Step 6: Verify the bottom tab bar**

Confirm 5 tabs are visible: Home / Schedule / Videos / Chat / Me. Tap each one — they should each show their placeholder screen.

- [ ] **Step 7: Sign out**

Go to the **Me** tab, tap **Sign Out**. You should bounce back to Login.

- [ ] **Step 8: Verify the user document was created**

Open the Firebase Console → Firestore Database. Confirm a `users/<uid>` document exists with `name`, `phoneNumber`, `role: "participant"`, and a `createdAt` timestamp.

- [ ] **Step 9: Promote yourself to admin and test the admin flow**

In the Firestore Console, edit your user doc and change `role` from `"participant"` to `"admin"`. Reopen the app — you should now see the **Admin** tab bar (Home / Community / Finance / Sessions / Profile) instead.

---

## Task 23: Final commit and push

- [ ] **Step 1: Run all tests one last time**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 2: Verify a clean working tree**

```bash
git status
```
Expected: `nothing to commit, working tree clean`.

- [ ] **Step 3: Tag the Phase 1 release**

```bash
git tag -a phase-1-foundation -m "Phase 1: foundation complete"
```

- [ ] **Step 4: (Optional) Push to remote**

If you have a remote configured:
```bash
git push origin main
git push origin phase-1-foundation
```

---

## Phase 1 Done — What You Have

After completing this plan:

- A working Expo Dev Build for iOS (and Android if you ran Step 5 in Task 7)
- Phone-OTP login that creates a Firebase Auth user
- An onboarding flow that creates a Firestore user document with `role: "participant"`
- A role-based tab bar that swaps between participant (5 tabs) and admin (5 tabs) views
- 10 placeholder tab screens ready for real content in later phases
- Strict security rules: users can only read/write their own document, role is pinned to `participant` on creation
- A test suite covering the auth helpers, user helpers, and both hooks (8 tests)
- A clean git history with one commit per task

## What's Next (Phase 2)

Phase 2 will build:
- The `classes` and `sessions` data model in Firestore
- A seed script to populate the season's Tuesday sessions (April 21 → September)
- The participant Schedule tab with the calendar view
- The Session Details screen
- RSVP without payment gating (gating arrives in Phase 3)
- The admin Sessions tab with the same calendar plus admin actions stubbed

Once Phase 1 is shipping cleanly, request Phase 2 by saying *"write Phase 2"*.
