import firestore from "@react-native-firebase/firestore";
import { createUserDoc } from "../../src/lib/users";

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
