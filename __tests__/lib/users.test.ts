import firestore from "@react-native-firebase/firestore";
import { createUserDoc, getUserDoc } from "../../src/lib/users";

describe("createUserDoc", () => {
  it("writes a user document with the participant role by default", async () => {
    const setMock = jest.fn().mockResolvedValue(undefined);
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ set: setMock }))
      }))
    });

    await createUserDoc({
      uid: "abc123",
      name: "Aryan",
      phoneNumber: "+15555555555"
    });

    expect(setMock).toHaveBeenCalledWith({
      uid: "abc123",
      name: "Aryan",
      phoneNumber: "+15555555555",
      role: "participant",
      createdAt: "SERVER_TIMESTAMP"
    });
  });
});

describe("getUserDoc", () => {
  it("returns the user doc when present", async () => {
    const data = {
      uid: "abc123",
      name: "Aryan",
      phoneNumber: "+15555555555",
      role: "admin",
      createdAt: 1700000000
    };
    const getMock = jest.fn().mockResolvedValue({ exists: true, data: () => data });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ doc: jest.fn(() => ({ get: getMock })) }))
    });

    const result = await getUserDoc("abc123");
    expect(result).toEqual(data);
  });

  it("returns null when the user doc does not exist", async () => {
    const getMock = jest.fn().mockResolvedValue({ exists: false });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ doc: jest.fn(() => ({ get: getMock })) }))
    });

    const result = await getUserDoc("missing");
    expect(result).toBeNull();
  });
});
