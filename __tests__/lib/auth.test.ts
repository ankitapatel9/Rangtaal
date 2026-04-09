import auth from "@react-native-firebase/auth";
import { signInWithPhone, confirmCode, signOut } from "../../src/lib/auth";

describe("signInWithPhone", () => {
  it("calls signInWithPhoneNumber with the E.164 number", async () => {
    const signInMock = jest.fn().mockResolvedValue({ verificationId: "VID" });
    (auth as unknown as jest.Mock).mockReturnValue({
      signInWithPhoneNumber: signInMock
    });

    const result = await signInWithPhone("+15555555555");
    expect(signInMock).toHaveBeenCalledWith("+15555555555");
    expect(result).toEqual({ verificationId: "VID" });
  });
});

describe("confirmCode", () => {
  it("calls confirm on the confirmation result", async () => {
    const confirmMock = jest.fn().mockResolvedValue({ user: { uid: "u1" } });
    const confirmation = { confirm: confirmMock };

    const result = await confirmCode(confirmation as any, "123456");
    expect(confirmMock).toHaveBeenCalledWith("123456");
    expect(result).toEqual({ user: { uid: "u1" } });
  });
});

describe("signOut", () => {
  it("calls firebase auth().signOut", async () => {
    const signOutMock = jest.fn().mockResolvedValue(undefined);
    (auth as unknown as jest.Mock).mockReturnValue({ signOut: signOutMock });

    await signOut();
    expect(signOutMock).toHaveBeenCalled();
  });
});
