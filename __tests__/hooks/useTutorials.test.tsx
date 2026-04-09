import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import firestore from "@react-native-firebase/firestore";
import { useTutorials } from "../../src/hooks/useTutorials";

const makeTutorialSnap = (overrides: Record<string, unknown> = {}) => ({
  id: "t1",
  sessionId: "s1",
  title: "Intro",
  description: "First tutorial",
  videoUrl: "https://example.com/v1.mp4",
  thumbnailUrl: null,
  createdAt: 1700000000,
  createdBy: "admin1",
  order: 0,
  ...overrides
});

describe("useTutorials", () => {
  it("returns empty array and loading=false when sessionId is undefined", () => {
    const { result } = renderHook(() => useTutorials(undefined));
    expect(result.current.tutorials).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("starts loading=true then updates when snapshot fires", async () => {
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

    const { result } = renderHook(() => useTutorials("s1"));
    expect(result.current.loading).toBe(true);
    expect(result.current.tutorials).toEqual([]);

    const data = makeTutorialSnap();
    await act(async () => {
      snapCb?.({
        docs: [{ id: "t1", data: () => data }]
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.tutorials).toHaveLength(1);
    expect(result.current.tutorials[0].id).toBe("t1");
    expect(result.current.tutorials[0].title).toBe("Intro");
  });

  it("handles empty snapshot (no tutorials)", async () => {
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

    const { result } = renderHook(() => useTutorials("s1"));

    await act(async () => {
      snapCb?.({ docs: [] });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.tutorials).toEqual([]);
  });

  it("calls where with sessionId and orderBy order asc", async () => {
    const onSnapshotMock = jest.fn(() => () => undefined);
    const orderByMock = jest.fn(() => ({ onSnapshot: onSnapshotMock }));
    const whereMock = jest.fn(() => ({ orderBy: orderByMock }));
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ where: whereMock }))
    });

    renderHook(() => useTutorials("session-abc"));

    expect(whereMock).toHaveBeenCalledWith("sessionId", "==", "session-abc");
    expect(orderByMock).toHaveBeenCalledWith("order", "asc");
  });

  it("calls error callback on snapshot error", async () => {
    let errCb: ((err: Error) => void) | undefined;
    const onSnapshotMock = jest.fn((_cb, errCallback) => {
      errCb = errCallback;
      return () => undefined;
    });
    const orderByMock = jest.fn(() => ({ onSnapshot: onSnapshotMock }));
    const whereMock = jest.fn(() => ({ orderBy: orderByMock }));
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ where: whereMock }))
    });

    const { result } = renderHook(() => useTutorials("s1"));

    await act(async () => {
      errCb?.(new Error("Firestore error"));
    });

    expect(result.current.loading).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
