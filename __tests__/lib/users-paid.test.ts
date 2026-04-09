import firestore from "@react-native-firebase/firestore";
import { toggleUserPaid, getAllUsers } from "../../src/lib/users";

describe("toggleUserPaid", () => {
  it("calls update({ paid: true }) on the user doc", async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ update: updateMock }))
      }))
    });

    await toggleUserPaid("user1", true);

    expect(updateMock).toHaveBeenCalledWith({ paid: true });
  });

  it("calls update({ paid: false }) on the user doc", async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ update: updateMock }))
      }))
    });

    await toggleUserPaid("user1", false);

    expect(updateMock).toHaveBeenCalledWith({ paid: false });
  });
});

describe("getAllUsers", () => {
  it("queries users ordered by name asc and returns UserDoc[]", async () => {
    const users = [
      { uid: "u1", name: "Aryan", phoneNumber: "+1111", role: "participant" as const, createdAt: 1, paid: false },
      { uid: "u2", name: "Zara", phoneNumber: "+2222", role: "admin" as const, createdAt: 2, paid: true }
    ];

    const getMock = jest.fn().mockResolvedValue({
      docs: users.map((u) => ({ id: u.uid, data: () => u }))
    });
    const orderByMock = jest.fn(() => ({ get: getMock }));
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ orderBy: orderByMock }))
    });

    const result = await getAllUsers();

    expect(orderByMock).toHaveBeenCalledWith("name", "asc");
    expect(result).toHaveLength(2);
    expect(result[0].uid).toBe("u1");
    expect(result[1].uid).toBe("u2");
  });
});
