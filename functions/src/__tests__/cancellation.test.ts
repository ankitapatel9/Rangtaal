// Mock firebase-admin before any imports
const mockSend = jest.fn().mockResolvedValue("message-id");
const mockMessaging = jest.fn(() => ({ send: mockSend }));
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockAdd = jest.fn().mockResolvedValue({ id: "notif-id" });
const mockDocRef = jest.fn(() => ({ update: mockUpdate }));
const mockCollection = jest.fn();

const mockServerTimestamp = jest.fn(() => ({ _methodName: "FieldValue.serverTimestamp" }));

jest.mock("firebase-admin", () => {
  const firestoreFn = jest.fn(() => ({ collection: mockCollection }));
  (firestoreFn as any).FieldValue = { serverTimestamp: mockServerTimestamp };
  return {
    initializeApp: jest.fn(),
    messaging: mockMessaging,
    firestore: firestoreFn,
  };
});

// Mock firebase-functions/v2/firestore so onDocumentUpdated is a passthrough
jest.mock("firebase-functions/v2/firestore", () => ({
  onDocumentUpdated: jest.fn(
    (_pattern: string, handler: (event: unknown) => Promise<void>) => handler
  ),
}));

import { handleSessionCancelled } from "../cancellation";

function makeSnapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    docs: docs.map((d) => ({
      id: d.id,
      data: () => d.data,
    })),
  };
}

function makeEvent(before: Record<string, unknown>, after: Record<string, unknown>) {
  return {
    data: {
      before: { data: () => before },
      after: { data: () => after },
    },
  };
}

describe("handleSessionCancelled", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue("message-id");
    mockAdd.mockResolvedValue({ id: "notif-id" });
  });

  it("does nothing when session was not previously upcoming", async () => {
    const event = makeEvent(
      { status: "cancelled", rsvps: ["user-1"] },
      { status: "cancelled", rsvps: ["user-1"] }
    );

    await handleSessionCancelled(event as any);

    expect(mockCollection).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("does nothing when new status is not cancelled", async () => {
    const event = makeEvent(
      { status: "upcoming", rsvps: ["user-1"] },
      { status: "upcoming", rsvps: ["user-1"] }
    );

    await handleSessionCancelled(event as any);

    expect(mockCollection).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends FCM to RSVP'd users when session is cancelled", async () => {
    const event = makeEvent(
      { status: "upcoming", rsvps: ["user-1", "user-2"] },
      {
        status: "cancelled",
        rsvps: ["user-1", "user-2"],
        cancellationReason: "Venue unavailable",
      }
    );

    const user1 = {
      id: "user-1",
      data: { uid: "user-1", name: "Alice", phoneNumber: "+15550001111", fcmToken: "token-alice" },
    };
    const user2 = {
      id: "user-2",
      data: { uid: "user-2", name: "Bob", phoneNumber: "+15550002222", fcmToken: "token-bob" },
    };
    const nonRsvpUser = {
      id: "user-3",
      data: { uid: "user-3", name: "Carol", phoneNumber: "+15550003333", fcmToken: "token-carol" },
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === "users") {
        return {
          get: jest.fn().mockResolvedValue(makeSnapshot([user1, user2, nonRsvpUser])),
          doc: mockDocRef,
        };
      }
      if (name === "notifications") {
        return { add: mockAdd };
      }
      return { doc: mockDocRef };
    });

    await handleSessionCancelled(event as any);

    // Only RSVP'd users (user-1, user-2) should be notified — not user-3
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "token-alice",
        notification: expect.objectContaining({
          body: expect.stringContaining("Venue unavailable"),
        }),
      })
    );
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "token-bob",
        notification: expect.objectContaining({
          body: expect.stringContaining("Venue unavailable"),
        }),
      })
    );
  });

  it("sends SMS to RSVP'd users without fcmToken", async () => {
    const event = makeEvent(
      { status: "upcoming", rsvps: ["user-sms"] },
      { status: "cancelled", rsvps: ["user-sms"], cancellationReason: "Rain" }
    );

    const smsUser = {
      id: "user-sms",
      data: { uid: "user-sms", name: "Dave", phoneNumber: "+15550004444", fcmToken: null },
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === "users") {
        return {
          get: jest.fn().mockResolvedValue(makeSnapshot([smsUser])),
          doc: mockDocRef,
        };
      }
      if (name === "notifications") {
        return { add: mockAdd };
      }
      return { doc: mockDocRef };
    });

    const smsMod = await import("../sms");
    const sendSmsSpy = jest.spyOn(smsMod, "sendSms").mockResolvedValue(undefined);

    await handleSessionCancelled(event as any);

    expect(sendSmsSpy).toHaveBeenCalledTimes(1);
    expect(sendSmsSpy).toHaveBeenCalledWith(
      "+15550004444",
      expect.stringContaining("Rain")
    );
    expect(mockSend).not.toHaveBeenCalled();

    sendSmsSpy.mockRestore();
  });

  it("does not notify non-RSVP'd users", async () => {
    const event = makeEvent(
      { status: "upcoming", rsvps: [] },
      { status: "cancelled", rsvps: [], cancellationReason: "No reason" }
    );

    const nonRsvpUser = {
      id: "user-x",
      data: { uid: "user-x", name: "Eve", phoneNumber: "+15550005555", fcmToken: "token-eve" },
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === "users") {
        return {
          get: jest.fn().mockResolvedValue(makeSnapshot([nonRsvpUser])),
          doc: mockDocRef,
        };
      }
      if (name === "notifications") {
        return { add: mockAdd };
      }
      return { doc: mockDocRef };
    });

    await handleSessionCancelled(event as any);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("handles missing event data gracefully", async () => {
    const event = { data: null };
    await handleSessionCancelled(event as any);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
