import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import firestore from "@react-native-firebase/firestore";
import { useComments } from "../../src/hooks/useComments";

describe("useComments", () => {
  it("starts as loading with empty comments", () => {
    (firestore as unknown as jest.Mock).mockImplementation(() => ({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            onSnapshot: jest.fn(() => () => undefined)
          }))
        }))
      }))
    }));

    const { result } = renderHook(() => useComments("media1"));
    expect(result.current.loading).toBe(true);
    expect(result.current.comments).toHaveLength(0);
  });

  it("organizes top-level comments with empty replies", async () => {
    let listener: ((snap: any) => void) | undefined;

    (firestore as unknown as jest.Mock).mockImplementation(() => ({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            onSnapshot: jest.fn((cb) => {
              listener = cb;
              return () => undefined;
            })
          }))
        }))
      }))
    }));

    const { result } = renderHook(() => useComments("media1"));

    await act(async () => {
      listener?.({
        docs: [
          {
            id: "c1",
            data: () => ({
              parentId: "media1",
              parentType: "media",
              replyToId: null,
              userId: "u1",
              userName: "Aryan",
              text: "Top comment",
              createdAt: 1000
            })
          }
        ]
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].text).toBe("Top comment");
    expect(result.current.comments[0].replies).toHaveLength(0);
  });

  it("nests replies under their parent top-level comment", async () => {
    let listener: ((snap: any) => void) | undefined;

    (firestore as unknown as jest.Mock).mockImplementation(() => ({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            onSnapshot: jest.fn((cb) => {
              listener = cb;
              return () => undefined;
            })
          }))
        }))
      }))
    }));

    const { result } = renderHook(() => useComments("media1"));

    await act(async () => {
      listener?.({
        docs: [
          {
            id: "c1",
            data: () => ({
              parentId: "media1",
              parentType: "media",
              replyToId: null,
              userId: "u1",
              userName: "Aryan",
              text: "Top comment",
              createdAt: 1000
            })
          },
          {
            id: "r1",
            data: () => ({
              parentId: "media1",
              parentType: "media",
              replyToId: "c1",
              userId: "u2",
              userName: "Priya",
              text: "A reply",
              createdAt: 2000
            })
          }
        ]
      });
    });

    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].replies).toHaveLength(1);
    expect(result.current.comments[0].replies[0].text).toBe("A reply");
  });

  it("excludes orphan replies (replies to unknown parents) from top-level", async () => {
    let listener: ((snap: any) => void) | undefined;

    (firestore as unknown as jest.Mock).mockImplementation(() => ({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            onSnapshot: jest.fn((cb) => {
              listener = cb;
              return () => undefined;
            })
          }))
        }))
      }))
    }));

    const { result } = renderHook(() => useComments("media1"));

    await act(async () => {
      listener?.({
        docs: [
          {
            id: "r1",
            data: () => ({
              parentId: "media1",
              parentType: "media",
              replyToId: "nonexistent",
              userId: "u2",
              userName: "Priya",
              text: "Orphan reply",
              createdAt: 2000
            })
          }
        ]
      });
    });

    // Orphan replies should not appear at top-level
    expect(result.current.comments).toHaveLength(0);
  });
});
