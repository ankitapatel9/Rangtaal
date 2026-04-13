import firestore from "@react-native-firebase/firestore";
import { cancelSession, rsvpToSession, removeRsvp, updateSessionTopic } from "../../src/lib/sessions";

describe("cancelSession", () => {
  it("writes status, cancellationReason, cancelledAt (serverTimestamp), and cancelledBy", async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ update: updateMock })),
      })),
    });

    await cancelSession("session1", "Venue unavailable", "admin1");

    expect(updateMock).toHaveBeenCalledWith({
      status: "cancelled",
      cancellationReason: "Venue unavailable",
      cancelledAt: "SERVER_TIMESTAMP",
      cancelledBy: "admin1",
    });
  });
});

describe("rsvpToSession (extended)", () => {
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

describe("removeRsvp (extended)", () => {
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

describe("updateSessionTopic", () => {
  it("writes topic and topicDescription to the session doc", async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);
    const docMock = jest.fn(() => ({ update: updateMock }));
    const collectionMock = jest.fn(() => ({ doc: docMock }));
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: collectionMock,
    });

    await updateSessionTopic("session1", "Dodhiya Garba", "Classic 8-count Dodhiya style");

    expect(collectionMock).toHaveBeenCalledWith("sessions");
    expect(docMock).toHaveBeenCalledWith("session1");
    expect(updateMock).toHaveBeenCalledWith({
      topic: "Dodhiya Garba",
      topicDescription: "Classic 8-count Dodhiya style",
    });
  });

  it("accepts empty topicDescription", async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ update: updateMock })),
      })),
    });

    await updateSessionTopic("session2", "Ras Garba", "");

    expect(updateMock).toHaveBeenCalledWith({
      topic: "Ras Garba",
      topicDescription: "",
    });
  });
});
