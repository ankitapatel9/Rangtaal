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
