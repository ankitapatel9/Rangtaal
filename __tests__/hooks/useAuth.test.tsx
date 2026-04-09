import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import auth from "@react-native-firebase/auth";
import { useAuth } from "../../src/hooks/useAuth";

describe("useAuth", () => {
  it("starts as loading and emits null when unauthenticated", async () => {
    let listener: ((u: any) => void) | undefined;
    const onAuthStateChangedMock = jest.fn((cb) => {
      listener = cb;
      return () => undefined;
    });
    (auth as unknown as jest.Mock).mockReturnValue({
      onAuthStateChanged: onAuthStateChangedMock
    });

    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);

    await act(async () => {
      listener?.(null);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("emits the user when authenticated", async () => {
    let listener: ((u: any) => void) | undefined;
    (auth as unknown as jest.Mock).mockReturnValue({
      onAuthStateChanged: (cb: any) => {
        listener = cb;
        return () => undefined;
      }
    });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      listener?.({ uid: "abc", phoneNumber: "+15555555555" });
    });

    expect(result.current.user).toEqual({ uid: "abc", phoneNumber: "+15555555555" });
  });
});
