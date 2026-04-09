import firestore from "@react-native-firebase/firestore";
import { addComment, getComments, deleteComment } from "../../src/lib/comments";

describe("addComment", () => {
  it("creates a comment doc with serverTimestamp", async () => {
    const addMock = jest.fn().mockResolvedValue({ id: "newCommentId" });

    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        add: addMock
      }))
    });

    await addComment({
      parentId: "media1",
      parentType: "media",
      replyToId: null,
      userId: "user1",
      userName: "Aryan",
      text: "Beautiful shot!"
    });

    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({
        parentId: "media1",
        parentType: "media",
        replyToId: null,
        userId: "user1",
        userName: "Aryan",
        text: "Beautiful shot!",
        createdAt: "SERVER_TIMESTAMP"
      })
    );
  });

  it("creates a reply with a non-null replyToId", async () => {
    const addMock = jest.fn().mockResolvedValue({ id: "replyId" });

    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        add: addMock
      }))
    });

    await addComment({
      parentId: "media1",
      parentType: "media",
      replyToId: "comment99",
      userId: "user2",
      userName: "Priya",
      text: "Agreed!"
    });

    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({
        replyToId: "comment99"
      })
    );
  });
});

describe("getComments", () => {
  it("returns comments ordered by createdAt for a parentId", async () => {
    const commentData = [
      {
        id: "c1",
        parentId: "media1",
        parentType: "media",
        replyToId: null,
        userId: "u1",
        userName: "Aryan",
        text: "First",
        createdAt: 1000
      },
      {
        id: "c2",
        parentId: "media1",
        parentType: "media",
        replyToId: null,
        userId: "u2",
        userName: "Priya",
        text: "Second",
        createdAt: 2000
      }
    ];

    const getMock = jest.fn().mockResolvedValue({
      docs: commentData.map((d) => ({ id: d.id, data: () => d }))
    });

    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            get: getMock
          }))
        }))
      }))
    });

    const results = await getComments("media1");
    expect(results).toHaveLength(2);
    expect(results[0].text).toBe("First");
    expect(results[1].text).toBe("Second");
  });

  it("returns an empty array when no comments exist", async () => {
    const getMock = jest.fn().mockResolvedValue({ docs: [] });

    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            get: getMock
          }))
        }))
      }))
    });

    const results = await getComments("media_none");
    expect(results).toHaveLength(0);
  });
});

describe("deleteComment", () => {
  it("deletes the comment doc by ID", async () => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);

    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          delete: deleteMock
        }))
      }))
    });

    await deleteComment("comment123");
    expect(deleteMock).toHaveBeenCalled();
  });

  it("targets the correct doc ID", async () => {
    const docMock = jest.fn(() => ({
      delete: jest.fn().mockResolvedValue(undefined)
    }));

    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ doc: docMock }))
    });

    await deleteComment("specificCommentId");
    expect(docMock).toHaveBeenCalledWith("specificCommentId");
  });
});
