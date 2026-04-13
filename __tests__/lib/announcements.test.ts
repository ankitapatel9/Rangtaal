import firestore from "@react-native-firebase/firestore";
import {
  createAnnouncement,
  getActiveAnnouncements,
  dismissAnnouncement,
} from "../../src/lib/announcements";

describe("createAnnouncement", () => {
  it("adds a doc with serverTimestamp, active: true, expiresAt: null", async () => {
    const addMock = jest.fn().mockResolvedValue({ id: "ann1" });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ add: addMock })),
    });

    const id = await createAnnouncement({
      text: "Garba starts early this week!",
      createdBy: "admin-uid",
    });

    expect(addMock).toHaveBeenCalledWith({
      text: "Garba starts early this week!",
      createdBy: "admin-uid",
      createdAt: "SERVER_TIMESTAMP",
      expiresAt: null,
      active: true,
    });
    expect(id).toBe("ann1");
  });
});

describe("getActiveAnnouncements", () => {
  it("queries where active == true, ordered by createdAt desc", async () => {
    const annDocs = [
      {
        id: "ann2",
        data: () => ({
          text: "No class this Friday",
          createdBy: "admin-uid",
          createdAt: 1712700000000,
          expiresAt: null,
          active: true,
        }),
      },
      {
        id: "ann1",
        data: () => ({
          text: "Garba starts early this week!",
          createdBy: "admin-uid",
          createdAt: 1712600000000,
          expiresAt: null,
          active: true,
        }),
      },
    ];
    const getMock = jest.fn().mockResolvedValue({ docs: annDocs });
    const orderByMock = jest.fn(() => ({ get: getMock }));
    const whereMock = jest.fn(() => ({ orderBy: orderByMock }));
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ where: whereMock })),
    });

    const result = await getActiveAnnouncements();

    expect(whereMock).toHaveBeenCalledWith("active", "==", true);
    expect(orderByMock).toHaveBeenCalledWith("createdAt", "desc");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("ann2");
    expect(result[0].text).toBe("No class this Friday");
    expect(result[1].id).toBe("ann1");
  });

  it("returns empty array when no active announcements exist", async () => {
    const getMock = jest.fn().mockResolvedValue({ docs: [] });
    const orderByMock = jest.fn(() => ({ get: getMock }));
    const whereMock = jest.fn(() => ({ orderBy: orderByMock }));
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ where: whereMock })),
    });

    const result = await getActiveAnnouncements();
    expect(result).toEqual([]);
  });
});

describe("dismissAnnouncement", () => {
  it("sets active: false on the announcement doc", async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ update: updateMock })),
      })),
    });

    await dismissAnnouncement("ann1");

    expect(updateMock).toHaveBeenCalledWith({ active: false });
  });
});
