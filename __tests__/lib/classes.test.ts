import firestore from "@react-native-firebase/firestore";
import { getActiveClass, createClassAndSeason } from "../../src/lib/classes";

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

describe("createClassAndSeason", () => {
  it("creates a class and one session per Tuesday between seasonStart and seasonEnd", async () => {
    const classAddMock = jest.fn().mockResolvedValue({ id: "classA" });
    const batchSetMock = jest.fn();
    const batchCommitMock = jest.fn().mockResolvedValue(undefined);
    const batchMock = { set: batchSetMock, commit: batchCommitMock };

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
    expect(batchSetMock.mock.calls[1][1].date).toBe("2026-04-28T19:30:00-05:00");
    expect(batchCommitMock).toHaveBeenCalled();
    expect(result).toBe("classA");
  });
});
