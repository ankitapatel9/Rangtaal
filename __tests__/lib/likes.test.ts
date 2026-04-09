import firestore from "@react-native-firebase/firestore";
import { toggleLike, getLikeCount, isLikedByUser } from "../../src/lib/likes";

describe("toggleLike", () => {
  it("creates a like doc when it does not exist", async () => {
    const setMock = jest.fn().mockResolvedValue(undefined);
    const getMock = jest.fn().mockResolvedValue({ exists: () => false });
    const deleteMock = jest.fn().mockResolvedValue(undefined);

    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: getMock,
          set: setMock,
          delete: deleteMock
        }))
      }))
    });

    await toggleLike("media1", "media", "user1");

    expect(getMock).toHaveBeenCalled();
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        parentId: "media1",
        parentType: "media",
        userId: "user1",
        createdAt: "SERVER_TIMESTAMP"
      })
    );
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes the like doc when it already exists (unlike)", async () => {
    const setMock = jest.fn().mockResolvedValue(undefined);
    const getMock = jest.fn().mockResolvedValue({ exists: () => true });
    const deleteMock = jest.fn().mockResolvedValue(undefined);

    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: getMock,
          set: setMock,
          delete: deleteMock
        }))
      }))
    });

    await toggleLike("media1", "media", "user1");

    expect(deleteMock).toHaveBeenCalled();
    expect(setMock).not.toHaveBeenCalled();
  });

  it("uses the composite doc ID {parentId}_{userId}", async () => {
    const docMock = jest.fn(() => ({
      get: jest.fn().mockResolvedValue({ exists: () => false }),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined)
    }));

    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ doc: docMock }))
    });

    await toggleLike("post99", "media", "userABC");

    expect(docMock).toHaveBeenCalledWith("post99_userABC");
  });
});

describe("getLikeCount", () => {
  it("returns the number of like docs for a parentId", async () => {
    const getMock = jest.fn().mockResolvedValue({
      docs: [{}, {}, {}]
    });

    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: getMock
        }))
      }))
    });

    const count = await getLikeCount("media1");
    expect(count).toBe(3);
  });

  it("returns 0 when no likes exist", async () => {
    const getMock = jest.fn().mockResolvedValue({ docs: [] });

    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: getMock
        }))
      }))
    });

    const count = await getLikeCount("media_none");
    expect(count).toBe(0);
  });
});

describe("isLikedByUser", () => {
  it("returns true when the like doc exists", async () => {
    const getMock = jest.fn().mockResolvedValue({ exists: () => true });

    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ get: getMock }))
      }))
    });

    const result = await isLikedByUser("media1", "user1");
    expect(result).toBe(true);
  });

  it("returns false when the like doc does not exist", async () => {
    const getMock = jest.fn().mockResolvedValue({ exists: () => false });

    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ get: getMock }))
      }))
    });

    const result = await isLikedByUser("media1", "user_nobody");
    expect(result).toBe(false);
  });

  it("uses the composite doc ID {parentId}_{userId}", async () => {
    const docMock = jest.fn(() => ({
      get: jest.fn().mockResolvedValue({ exists: () => false })
    }));

    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ doc: docMock }))
    });

    await isLikedByUser("postXX", "userYY");
    expect(docMock).toHaveBeenCalledWith("postXX_userYY");
  });
});
