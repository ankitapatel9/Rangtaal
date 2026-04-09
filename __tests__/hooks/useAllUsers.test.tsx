import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import firestore from "@react-native-firebase/firestore";
import { useAllUsers } from "../../src/hooks/useAllUsers";

describe("useAllUsers", () => {
  it("subscribes via onSnapshot to users ordered by name asc and returns users + loading", async () => {
    let snapCb: ((snap: any) => void) | undefined;
    const onSnapshotMock = jest.fn((successCb, _errorCb) => {
      snapCb = successCb;
      return () => undefined;
    });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        orderBy: jest.fn(() => ({ onSnapshot: onSnapshotMock }))
      }))
    });

    const { result } = renderHook(() => useAllUsers());
    expect(result.current.loading).toBe(true);
    expect(result.current.users).toEqual([]);

    await act(async () => {
      snapCb?.({
        docs: [
          {
            id: "u1",
            data: () => ({
              name: "Aryan",
              phoneNumber: "+1111",
              role: "participant",
              createdAt: 1,
              paid: false
            })
          },
          {
            id: "u2",
            data: () => ({
              name: "Zara",
              phoneNumber: "+2222",
              role: "admin",
              createdAt: 2,
              paid: true
            })
          }
        ]
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.users).toHaveLength(2);
    expect(result.current.users[0].uid).toBe("u1");
    expect(result.current.users[0].paid).toBe(false);
    expect(result.current.users[1].uid).toBe("u2");
    expect(result.current.users[1].paid).toBe(true);
  });

  it("passes orderBy name asc to the collection query", async () => {
    const onSnapshotMock = jest.fn(() => () => undefined);
    const orderByMock = jest.fn(() => ({ onSnapshot: onSnapshotMock }));
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ orderBy: orderByMock }))
    });

    renderHook(() => useAllUsers());

    expect(orderByMock).toHaveBeenCalledWith("name", "asc");
  });
});
