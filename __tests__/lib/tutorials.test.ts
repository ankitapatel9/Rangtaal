import firestore from "@react-native-firebase/firestore";
import {
  getTutorialsForSession,
  createTutorial,
  deleteTutorial
} from "../../src/lib/tutorials";

describe("getTutorialsForSession", () => {
  it("queries tutorials collection filtered by sessionId ordered by order asc", async () => {
    const tutorialData = {
      id: "t1",
      sessionId: "s1",
      title: "Intro",
      description: "First tutorial",
      videoUrl: "https://example.com/v1.mp4",
      thumbnailUrl: null,
      createdAt: 1700000000,
      createdBy: "admin1",
      order: 0
    };
    const getMock = jest.fn().mockResolvedValue({
      docs: [{ id: "t1", data: () => tutorialData }]
    });
    const orderByMock = jest.fn(() => ({ get: getMock }));
    const whereMock = jest.fn(() => ({ orderBy: orderByMock }));
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ where: whereMock }))
    });

    const results = await getTutorialsForSession("s1");

    expect(whereMock).toHaveBeenCalledWith("sessionId", "==", "s1");
    expect(orderByMock).toHaveBeenCalledWith("order", "asc");
    expect(results).toEqual([{ ...tutorialData, id: "t1" }]);
  });

  it("returns an empty array when no tutorials exist", async () => {
    const getMock = jest.fn().mockResolvedValue({ docs: [] });
    const orderByMock = jest.fn(() => ({ get: getMock }));
    const whereMock = jest.fn(() => ({ orderBy: orderByMock }));
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ where: whereMock }))
    });

    const results = await getTutorialsForSession("s2");
    expect(results).toEqual([]);
  });
});

describe("createTutorial", () => {
  it("adds a doc to tutorials collection with serverTimestamp for createdAt", async () => {
    const addMock = jest.fn().mockResolvedValue({ id: "newTutorialId" });
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ add: addMock }))
    });

    await createTutorial({
      sessionId: "s1",
      title: "Test Tutorial",
      description: "A test",
      videoUrl: "https://example.com/v.mp4",
      thumbnailUrl: null,
      createdBy: "admin1",
      order: 1
    });

    expect(addMock).toHaveBeenCalledWith({
      sessionId: "s1",
      title: "Test Tutorial",
      description: "A test",
      videoUrl: "https://example.com/v.mp4",
      thumbnailUrl: null,
      createdAt: "SERVER_TIMESTAMP",
      createdBy: "admin1",
      order: 1
    });
  });
});

describe("deleteTutorial", () => {
  it("deletes the tutorial document by id", async () => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    (firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ delete: deleteMock }))
      }))
    });

    await deleteTutorial("t1");
    expect(deleteMock).toHaveBeenCalled();
  });
});
