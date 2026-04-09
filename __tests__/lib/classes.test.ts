import firestore from "@react-native-firebase/firestore";
import { getActiveClass } from "../../src/lib/classes";

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
