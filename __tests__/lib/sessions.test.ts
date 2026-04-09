import firestore from "@react-native-firebase/firestore";
import { cancelSession } from "../../src/lib/sessions";

describe("cancelSession", () => {
  it("updates the session document with cancelled status and reason", async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ update: updateMock })),
      })),
    });

    await cancelSession("session-abc", "Venue flooded", "admin-uid-1");

    expect(updateMock).toHaveBeenCalledWith({
      status: "cancelled",
      cancellationReason: "Venue flooded",
      cancelledAt: "SERVER_TIMESTAMP",
      cancelledBy: "admin-uid-1",
    });
  });

  it("propagates Firestore errors", async () => {
    const updateMock = jest.fn().mockRejectedValue(new Error("Firestore error"));
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ update: updateMock })),
      })),
    });

    await expect(
      cancelSession("session-abc", "Some reason", "admin-uid-1")
    ).rejects.toThrow("Firestore error");
  });
});
