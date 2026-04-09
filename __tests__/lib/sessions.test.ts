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
