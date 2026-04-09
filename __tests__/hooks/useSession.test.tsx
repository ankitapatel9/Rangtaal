import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import firestore from "@react-native-firebase/firestore";
import { useSession } from "../../src/hooks/useSession";

describe("useSession", () => {
  it("subscribes to a single session doc by id and updates on snapshot", async () => {
    let snapCb: ((snap: any) => void) | undefined;
    const onSnapshotMock = jest.fn((cb) => {
      snapCb = cb;
      return () => undefined;
    });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ onSnapshot: onSnapshotMock })),
      })),
    });

    const { result } = renderHook(() => useSession("s1"));
    expect(result.current.loading).toBe(true);

    await act(async () => {
      snapCb?.({
        exists: () => true,
        id: "s1",
        data: () => ({
          classId: "c1",
          date: "2026-04-21T19:30:00-05:00",
          status: "upcoming",
          rsvps: ["u1"],
          customMessage: null,
          cancellationReason: null,
          cancelledAt: null,
          cancelledBy: null,
          reminderSent: { dayBefore: false, dayOf: false },
        }),
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.session?.id).toBe("s1");
    expect(result.current.session?.rsvps).toEqual(["u1"]);
  });

  it("returns null session when id is undefined", () => {
    const { result } = renderHook(() => useSession(undefined));
    expect(result.current.session).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
