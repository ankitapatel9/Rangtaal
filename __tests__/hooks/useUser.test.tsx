import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import firestore from "@react-native-firebase/firestore";
import { useUser } from "../../src/hooks/useUser";

describe("useUser", () => {
  it("returns null while loading and updates when snapshot fires", async () => {
    let snapCb: ((snap: any) => void) | undefined;
    const onSnapshotMock = jest.fn((cb) => {
      snapCb = cb;
      return () => undefined;
    });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ onSnapshot: onSnapshotMock }))
      }))
    });

    const { result } = renderHook(() => useUser("abc"));
    expect(result.current.loading).toBe(true);

    await act(async () => {
      snapCb?.({
        exists: () => true,
        data: () => ({
          uid: "abc",
          name: "Aryan",
          phoneNumber: "+15555555555",
          role: "admin",
          createdAt: 1
        })
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user?.role).toBe("admin");
  });

  it("returns null user when uid is undefined", () => {
    const { result } = renderHook(() => useUser(undefined));
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
