jest.mock("@react-native-firebase/messaging", () => {
  const messagingMock: any = jest.fn(() => ({
    requestPermission: jest.fn().mockResolvedValue(1),
    registerDeviceForRemoteMessages: jest.fn().mockResolvedValue(undefined),
    getToken: jest.fn().mockResolvedValue("mock-fcm-token"),
    onTokenRefresh: jest.fn(() => jest.fn()),
  }));
  messagingMock.AuthorizationStatus = { AUTHORIZED: 1, PROVISIONAL: 2 };
  return { __esModule: true, default: messagingMock };
});

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
  firestoreMock.FieldValue = {
    serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP"),
    arrayUnion: jest.fn((val) => ({ __op: "arrayUnion", val })),
    arrayRemove: jest.fn((val) => ({ __op: "arrayRemove", val })),
  };
  return { __esModule: true, default: firestoreMock };
});
