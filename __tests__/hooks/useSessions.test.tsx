import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import firestore from "@react-native-firebase/firestore";
import { useSessions } from "../../src/hooks/useSessions";

describe("useSessions", () => {
  it("subscribes to sessions for a class and updates state on snapshot", async () => {
    let snapCb: ((snap: any) => void) | undefined;
    const onSnapshotMock = jest.fn((cb) => {
      snapCb = cb;
      return () => undefined;
    });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(() => ({ onSnapshot: onSnapshotMock })),
        })),
      })),
    });

    const { result } = renderHook(() => useSessions("c1"));
    expect(result.current.loading).toBe(true);

    await act(async () => {
      snapCb?.({
        docs: [
          {
            id: "s1",
            data: () => ({
              classId: "c1",
              date: "2026-04-21T19:30:00-05:00",
              status: "upcoming",
              rsvps: [],
              customMessage: null,
              cancellationReason: null,
              cancelledAt: null,
              cancelledBy: null,
              reminderSent: { dayBefore: false, dayOf: false },
            }),
          },
        ],
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].id).toBe("s1");
  });

  it("returns empty list when classId is undefined", () => {
    const { result } = renderHook(() => useSessions(undefined));
    expect(result.current.sessions).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
