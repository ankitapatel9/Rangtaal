import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import firestore from "@react-native-firebase/firestore";
import { useLikes } from "../../src/hooks/useLikes";

function buildFirestoreMock(
  countSnapshotCb: { capture: (cb: (snap: any) => void) => void },
  userSnapshotCb: { capture: (cb: (snap: any) => void) => void }
) {
  let countListener: ((snap: any) => void) | undefined;
  let userListener: ((snap: any) => void) | undefined;

  countSnapshotCb.capture = (cb) => {
    countListener = cb;
  };
  userSnapshotCb.capture = (cb) => {
    userListener = cb;
  };

  const countOnSnapshot = jest.fn((cb) => {
    countListener = cb;
    return () => undefined;
  });

  const userOnSnapshot = jest.fn((cb) => {
    userListener = cb;
    return () => undefined;
  });

  // First call: count query (collection -> where -> onSnapshot)
  // Second call: user doc (collection -> doc -> onSnapshot)
  let collectionCallCount = 0;
  (firestore as unknown as jest.Mock).mockImplementation(() => ({
    collection: jest.fn(() => {
      collectionCallCount++;
      if (collectionCallCount % 2 === 1) {
        // count subscription path
        return {
          where: jest.fn(() => ({
            onSnapshot: countOnSnapshot
          }))
        };
      } else {
        // user doc subscription path
        return {
          doc: jest.fn(() => ({
            onSnapshot: userOnSnapshot
          }))
        };
      }
    })
  }));

  return { countOnSnapshot, userOnSnapshot, getCountListener: () => countListener, getUserListener: () => userListener };
}

describe("useLikes", () => {
  it("starts with count 0 and isLiked false", () => {
    (firestore as unknown as jest.Mock).mockImplementation(() => ({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({ onSnapshot: jest.fn(() => () => undefined) })),
        doc: jest.fn(() => ({ onSnapshot: jest.fn(() => () => undefined) }))
      }))
    }));

    const { result } = renderHook(() => useLikes("media1", "user1"));
    expect(result.current.count).toBe(0);
    expect(result.current.isLiked).toBe(false);
  });

  it("updates count when count snapshot fires", async () => {
    let countListener: ((snap: any) => void) | undefined;
    let userListener: ((snap: any) => void) | undefined;

    (firestore as unknown as jest.Mock).mockImplementation(() => ({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          onSnapshot: jest.fn((cb) => {
            countListener = cb;
            return () => undefined;
          })
        })),
        doc: jest.fn(() => ({
          onSnapshot: jest.fn((cb) => {
            userListener = cb;
            return () => undefined;
          })
        }))
      }))
    }));

    const { result } = renderHook(() => useLikes("media1", "user1"));

    await act(async () => {
      countListener?.({ docs: [{}, {}, {}] });
    });

    expect(result.current.count).toBe(3);
  });

  it("updates isLiked when user snapshot fires with existing doc", async () => {
    let countListener: ((snap: any) => void) | undefined;
    let userListener: ((snap: any) => void) | undefined;

    (firestore as unknown as jest.Mock).mockImplementation(() => ({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          onSnapshot: jest.fn((cb) => {
            countListener = cb;
            return () => undefined;
          })
        })),
        doc: jest.fn(() => ({
          onSnapshot: jest.fn((cb) => {
            userListener = cb;
            return () => undefined;
          })
        }))
      }))
    }));

    const { result } = renderHook(() => useLikes("media1", "user1"));

    await act(async () => {
      userListener?.({ exists: () => true });
    });

    expect(result.current.isLiked).toBe(true);
  });

  it("sets isLiked to false when user doc does not exist", async () => {
    let countListener: ((snap: any) => void) | undefined;
    let userListener: ((snap: any) => void) | undefined;

    (firestore as unknown as jest.Mock).mockImplementation(() => ({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          onSnapshot: jest.fn((cb) => {
            countListener = cb;
            return () => undefined;
          })
        })),
        doc: jest.fn(() => ({
          onSnapshot: jest.fn((cb) => {
            userListener = cb;
            return () => undefined;
          })
        }))
      }))
    }));

    const { result } = renderHook(() => useLikes("media1", "user1"));

    await act(async () => {
      userListener?.({ exists: () => false });
    });

    expect(result.current.isLiked).toBe(false);
  });

  it("exposes a toggle function", () => {
    (firestore as unknown as jest.Mock).mockImplementation(() => ({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({ onSnapshot: jest.fn(() => () => undefined) })),
        doc: jest.fn(() => ({ onSnapshot: jest.fn(() => () => undefined) }))
      }))
    }));

    const { result } = renderHook(() => useLikes("media1", "user1"));
    expect(typeof result.current.toggle).toBe("function");
  });
});
