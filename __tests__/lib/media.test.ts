import firestore from "@react-native-firebase/firestore";
import { getMediaForSession, createMedia, deleteMedia } from "../../src/lib/media";

describe("getMediaForSession", () => {
  it("queries the media collection filtered by sessionId ordered by uploadedAt desc", async () => {
    const docData = {
      id: "m1",
      sessionId: "s1",
      type: "photo",
      storageUrl: "https://example.com/photo.jpg",
      uploadedBy: "user1",
      uploadedAt: 1700000000,
      comments: null,
      tags: null,
      analysis: null
    };
    const getMock = jest.fn().mockResolvedValue({
      docs: [{ id: "m1", data: () => docData }]
    });
    const orderByMock = jest.fn(() => ({ get: getMock }));
    const whereMock = jest.fn(() => ({ orderBy: orderByMock }));
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ where: whereMock }))
    });

    const result = await getMediaForSession("s1");

    expect(whereMock).toHaveBeenCalledWith("sessionId", "==", "s1");
    expect(orderByMock).toHaveBeenCalledWith("uploadedAt", "desc");
    expect(result).toEqual([{ ...docData, id: "m1" }]);
  });

  it("returns an empty array when no media exists", async () => {
    const getMock = jest.fn().mockResolvedValue({ docs: [] });
    const orderByMock = jest.fn(() => ({ get: getMock }));
    const whereMock = jest.fn(() => ({ orderBy: orderByMock }));
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ where: whereMock }))
    });

    const result = await getMediaForSession("empty-session");
    expect(result).toEqual([]);
  });
});

describe("createMedia", () => {
  it("adds a media document with serverTimestamp and null future fields", async () => {
    const addMock = jest.fn().mockResolvedValue({ id: "newMediaId" });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ add: addMock }))
    });

    const input = {
      sessionId: "s1",
      type: "photo" as const,
      storageUrl: "https://example.com/photo.jpg",
      uploadedBy: "user1"
    };
    await createMedia(input);

    expect(addMock).toHaveBeenCalledWith({
      sessionId: "s1",
      type: "photo",
      storageUrl: "https://example.com/photo.jpg",
      uploadedBy: "user1",
      uploadedAt: "SERVER_TIMESTAMP",
      comments: null,
      tags: null,
      analysis: null
    });
  });
});

describe("deleteMedia", () => {
  it("deletes the media document by id", async () => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ delete: deleteMock }))
      }))
    });

    await deleteMedia("m1");
    expect(deleteMock).toHaveBeenCalled();
  });
});
