import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import firestore from "@react-native-firebase/firestore";
import { useMedia } from "../../src/hooks/useMedia";

const makeDoc = (id: string, overrides = {}) => ({
  id,
  sessionId: "s1",
  type: "photo" as const,
  storageUrl: `https://example.com/${id}.jpg`,
  uploadedBy: "user1",
  uploadedAt: 1700000000,
  comments: null,
  tags: null,
  analysis: null,
  ...overrides
});

describe("useMedia", () => {
  it("starts loading and resolves with media when snapshot fires", async () => {
    let snapCb: ((snap: any) => void) | undefined;
    const onSnapshotMock = jest.fn((cb, _errCb) => {
      snapCb = cb;
      return () => undefined;
    });
    const orderByMock = jest.fn(() => ({ onSnapshot: onSnapshotMock }));
    const whereMock = jest.fn(() => ({ orderBy: orderByMock }));
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ where: whereMock }))
    });

    const { result } = renderHook(() => useMedia("s1"));
    expect(result.current.loading).toBe(true);

    await act(async () => {
      snapCb?.({
        docs: [{ id: "m1", data: () => makeDoc("m1") }]
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.media).toHaveLength(1);
    expect(result.current.media[0].id).toBe("m1");
    expect(result.current.media[0].type).toBe("photo");
  });

  it("queries by sessionId ordered by uploadedAt desc", async () => {
    const onSnapshotMock = jest.fn((_cb, _errCb) => () => undefined);
    const orderByMock = jest.fn(() => ({ onSnapshot: onSnapshotMock }));
    const whereMock = jest.fn(() => ({ orderBy: orderByMock }));
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ where: whereMock }))
    });

    renderHook(() => useMedia("s1"));

    expect(whereMock).toHaveBeenCalledWith("sessionId", "==", "s1");
    expect(orderByMock).toHaveBeenCalledWith("uploadedAt", "desc");
  });

  it("returns empty media and not loading when sessionId is undefined", () => {
    const { result } = renderHook(() => useMedia(undefined));
    expect(result.current.media).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("handles multiple docs in snapshot", async () => {
    let snapCb: ((snap: any) => void) | undefined;
    const onSnapshotMock = jest.fn((cb, _errCb) => {
      snapCb = cb;
      return () => undefined;
    });
    const orderByMock = jest.fn(() => ({ onSnapshot: onSnapshotMock }));
    const whereMock = jest.fn(() => ({ orderBy: orderByMock }));
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ where: whereMock }))
    });

    const { result } = renderHook(() => useMedia("s1"));

    await act(async () => {
      snapCb?.({
        docs: [
          { id: "m1", data: () => makeDoc("m1") },
          { id: "m2", data: () => makeDoc("m2", { type: "video" }) }
        ]
      });
    });

    expect(result.current.media).toHaveLength(2);
    expect(result.current.media[1].type).toBe("video");
  });
});
