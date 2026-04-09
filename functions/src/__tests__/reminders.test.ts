// Mock firebase-admin before any imports
const mockSend = jest.fn().mockResolvedValue("message-id");
const mockMessaging = jest.fn(() => ({ send: mockSend }));

const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockGet = jest.fn();
const mockDocRef = jest.fn(() => ({ update: mockUpdate }));
const mockCollectionGet = jest.fn();

// We'll configure per-collection mocking in beforeEach
const mockCollection = jest.fn();

jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  messaging: mockMessaging,
  firestore: jest.fn(() => ({ collection: mockCollection })),
}));

// Mock firebase-functions/v2/scheduler so onSchedule just calls through
jest.mock("firebase-functions/v2/scheduler", () => ({
  onSchedule: jest.fn((config: unknown, handler: () => Promise<void>) => handler),
}));

import { processReminders } from "../reminders";

// Helper to build a mock Firestore QuerySnapshot
function makeSnapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    docs: docs.map((d) => ({
      id: d.id,
      data: () => d.data,
    })),
  };
}

describe("processReminders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockResolvedValue(undefined);
    mockSend.mockResolvedValue("message-id");
  });

  it("sends FCM push to RSVP'd user with fcmToken (dayBefore)", async () => {
    const targetDate = getTomorrow();

    const sessionDoc = {
      id: "session-1",
      data: {
        date: `${targetDate}T20:00:00`,
        time: "8:00 PM",
        location: "Test Hall",
        status: "upcoming",
        rsvps: ["user-1"],
        reminderSent: { dayBefore: false, dayOf: false },
      },
    };

    const userDoc = {
      id: "user-1",
      data: {
        uid: "user-1",
        name: "Alice",
        phoneNumber: "+15550001111",
        fcmToken: "fcm-token-alice",
      },
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === "sessions") {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue(makeSnapshot([sessionDoc])),
          doc: mockDocRef,
        };
      }
      if (name === "users") {
        return {
          get: jest.fn().mockResolvedValue(makeSnapshot([userDoc])),
          doc: mockDocRef,
        };
      }
      return { doc: mockDocRef };
    });

    await processReminders("dayBefore");

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "fcm-token-alice",
        notification: expect.objectContaining({
          body: expect.stringContaining("signed up"),
        }),
      })
    );
    expect(mockUpdate).toHaveBeenCalledWith({ "reminderSent.dayBefore": true });
  });

  it("sends SMS to RSVP'd user without fcmToken (dayOf)", async () => {
    const targetDate = getToday();

    const sessionDoc = {
      id: "session-2",
      data: {
        date: `${targetDate}T20:00:00`,
        time: "8:00 PM",
        location: "Test Hall",
        status: "upcoming",
        rsvps: ["user-2"],
        reminderSent: { dayBefore: true, dayOf: false },
      },
    };

    const userDoc = {
      id: "user-2",
      data: {
        uid: "user-2",
        name: "Bob",
        phoneNumber: "+15550002222",
        fcmToken: null,
      },
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === "sessions") {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue(makeSnapshot([sessionDoc])),
          doc: mockDocRef,
        };
      }
      if (name === "users") {
        return {
          get: jest.fn().mockResolvedValue(makeSnapshot([userDoc])),
          doc: mockDocRef,
        };
      }
      return { doc: mockDocRef };
    });

    // Mock sendSms via module — we'll spy on it
    const smsMod = await import("../sms");
    const sendSmsSpy = jest
      .spyOn(smsMod, "sendSms")
      .mockResolvedValue(undefined);

    await processReminders("dayOf");

    expect(sendSmsSpy).toHaveBeenCalledTimes(1);
    expect(sendSmsSpy).toHaveBeenCalledWith(
      "+15550002222",
      expect.stringContaining("tonight")
    );
    expect(mockUpdate).toHaveBeenCalledWith({ "reminderSent.dayOf": true });

    sendSmsSpy.mockRestore();
  });

  it("sends non-RSVP message to non-RSVP'd user with fcmToken (dayBefore)", async () => {
    const targetDate = getTomorrow();

    const sessionDoc = {
      id: "session-3",
      data: {
        date: `${targetDate}T20:00:00`,
        time: "8:00 PM",
        location: "Test Hall",
        status: "upcoming",
        rsvps: [],
        reminderSent: { dayBefore: false, dayOf: false },
      },
    };

    const userDoc = {
      id: "user-3",
      data: {
        uid: "user-3",
        name: "Carol",
        phoneNumber: "+15550003333",
        fcmToken: "fcm-token-carol",
      },
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === "sessions") {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue(makeSnapshot([sessionDoc])),
          doc: mockDocRef,
        };
      }
      if (name === "users") {
        return {
          get: jest.fn().mockResolvedValue(makeSnapshot([userDoc])),
          doc: mockDocRef,
        };
      }
      return { doc: mockDocRef };
    });

    await processReminders("dayBefore");

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "fcm-token-carol",
        notification: expect.objectContaining({
          body: expect.stringContaining("RSVP"),
        }),
      })
    );
  });

  it("skips sessions with reminderSent already true", async () => {
    // processReminders queries Firestore with where("reminderSent.dayBefore", "==", false)
    // So an empty result means no sessions to process
    mockCollection.mockImplementation((name: string) => {
      if (name === "sessions") {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue(makeSnapshot([])),
        };
      }
      return { doc: mockDocRef };
    });

    await processReminders("dayBefore");

    expect(mockSend).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// Date helpers
function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}
