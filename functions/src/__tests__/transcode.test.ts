// ─── Firebase Admin mock ──────────────────────────────────────────────────────
const mockMakePublic = jest.fn().mockResolvedValue(undefined);
const mockDownload = jest.fn().mockResolvedValue(undefined);
const mockUploadBucket = jest.fn().mockResolvedValue(undefined);

const mockFile = jest.fn(() => ({
  download: mockDownload,
  makePublic: mockMakePublic,
}));

const mockBucket = jest.fn(() => ({
  file: mockFile,
  upload: mockUploadBucket,
}));

const mockGet = jest.fn();
const mockLimit = jest.fn(() => ({ get: mockGet }));
const mockWhere = jest.fn(() => ({ limit: mockLimit }));
const mockCollection = jest.fn(() => ({ where: mockWhere }));

jest.mock("firebase-admin", () => ({
  apps: [],
  initializeApp: jest.fn(),
  storage: jest.fn(() => ({ bucket: mockBucket })),
  firestore: jest.fn(() => ({ collection: mockCollection })),
}));

// ─── Storage trigger mock ─────────────────────────────────────────────────────
// Capture the handler so tests can invoke it directly
let capturedHandler: ((event: unknown) => Promise<void>) | null = null;

jest.mock("firebase-functions/v2/storage", () => ({
  onObjectFinalized: jest.fn(
    (_config: unknown, handler: (event: unknown) => Promise<void>) => {
      capturedHandler = handler;
      return handler;
    }
  ),
}));

// ─── child_process mock ───────────────────────────────────────────────────────
const mockExecSync = jest.fn();
jest.mock("child_process", () => ({ execSync: mockExecSync }));

// ─── fs mock ─────────────────────────────────────────────────────────────────
const mockExistsSync = jest.fn().mockReturnValue(false);
const mockUnlinkSync = jest.fn();

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  existsSync: mockExistsSync,
  unlinkSync: mockUnlinkSync,
}));

// ─── sharp mock ───────────────────────────────────────────────────────────────
const mockToFile = jest.fn().mockResolvedValue(undefined);
const mockJpeg = jest.fn(() => ({ toFile: mockToFile }));
const mockResize = jest.fn(() => ({ jpeg: mockJpeg }));
const mockSharp = jest.fn(() => ({ resize: mockResize }));

jest.mock("sharp", () => mockSharp, { virtual: true });

// Import triggers handler registration
import "../transcode";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeEvent(overrides: {
  name?: string;
  contentType?: string;
  bucket?: string;
}): unknown {
  return {
    data: {
      name: overrides.name ?? "sessions/s1/media/video.mov",
      contentType: overrides.contentType ?? "video/quicktime",
      bucket: overrides.bucket ?? "rangtaal-app.firebasestorage.app",
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("onVideoUploaded", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no Firestore docs found
    mockGet.mockResolvedValue({ empty: true, docs: [] });
    // Default: thumbnail not generated
    mockExistsSync.mockReturnValue(false);
    // Default: execSync succeeds
    mockExecSync.mockReturnValue(Buffer.from(""));
  });

  it("registers a handler via onObjectFinalized", () => {
    expect(capturedHandler).not.toBeNull();
  });

  it("skips files not in sessions/*/media/ or tutorials/", async () => {
    await capturedHandler!(makeEvent({ name: "uploads/random/file.mp4" }));
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it("skips files that already contain _720p in the name", async () => {
    await capturedHandler!(
      makeEvent({ name: "sessions/s1/media/video_720p.mp4", contentType: "video/mp4" })
    );
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it("skips files that already contain _thumb in the name", async () => {
    await capturedHandler!(
      makeEvent({ name: "sessions/s1/media/video_thumb.jpg", contentType: "image/jpeg" })
    );
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it("skips files under the thumbnails/ prefix", async () => {
    await capturedHandler!(
      makeEvent({ name: "thumbnails/video_thumb.jpg", contentType: "image/jpeg" })
    );
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it("skips non-video non-image content types (e.g. application/pdf)", async () => {
    await capturedHandler!(
      makeEvent({
        name: "sessions/s1/media/document.pdf",
        contentType: "application/pdf",
      })
    );
    // File is downloaded but no ffmpeg or sharp call should happen
    // Actually: download happens, then neither branch matches → no execSync
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it("runs ffmpeg transcode for videos in sessions/*/media/", async () => {
    await capturedHandler!(
      makeEvent({ name: "sessions/s1/media/video.mov", contentType: "video/quicktime" })
    );
    expect(mockExecSync).toHaveBeenCalledTimes(2); // transcode + thumbnail
    const firstCall: string = mockExecSync.mock.calls[0][0];
    expect(firstCall).toContain("scale=-2:720");
    expect(firstCall).toContain("libx264");
  });

  it("runs ffmpeg transcode for videos in tutorials/", async () => {
    await capturedHandler!(
      makeEvent({ name: "tutorials/lesson1.mp4", contentType: "video/mp4" })
    );
    expect(mockExecSync).toHaveBeenCalled();
    const firstCall: string = mockExecSync.mock.calls[0][0];
    expect(firstCall).toContain("libx264");
  });

  it("uploads transcoded 720p file and sets contentType video/mp4", async () => {
    await capturedHandler!(
      makeEvent({ name: "sessions/s1/media/clip.mp4", contentType: "video/mp4" })
    );
    expect(mockUploadBucket).toHaveBeenCalledWith(
      expect.stringContaining("_720p.mp4"),
      expect.objectContaining({ metadata: { contentType: "video/mp4" } })
    );
  });

  it("uploads thumbnail when ffmpeg thumbnail command succeeds and file exists", async () => {
    mockExistsSync.mockReturnValue(true);

    await capturedHandler!(
      makeEvent({ name: "sessions/s1/media/clip.mp4", contentType: "video/mp4" })
    );

    // Second upload call should be the thumbnail
    const destinations: string[] = mockUploadBucket.mock.calls.map(
      (c: unknown[]) => (c[1] as { destination: string }).destination
    );
    expect(destinations.some((d) => d.startsWith("thumbnails/"))).toBe(true);
  });

  it("updates media Firestore doc with transcoded URL", async () => {
    const mockDocRef = { update: jest.fn().mockResolvedValue(undefined) };
    mockGet.mockResolvedValue({
      empty: false,
      docs: [{ id: "media-1", ref: mockDocRef }],
    });

    await capturedHandler!(
      makeEvent({ name: "sessions/s1/media/clip.mp4", contentType: "video/mp4" })
    );

    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        storageUrl: expect.stringContaining("_720p"),
        originalUrl: expect.stringContaining("clip.mp4"),
      })
    );
  });

  it("continues without thumbnail if thumbnail ffmpeg fails", async () => {
    // First execSync (transcode) succeeds, second (thumbnail) throws
    mockExecSync
      .mockReturnValueOnce(Buffer.from(""))
      .mockImplementationOnce(() => { throw new Error("ffmpeg thumb fail"); });
    mockExistsSync.mockReturnValue(false);

    await capturedHandler!(
      makeEvent({ name: "sessions/s1/media/clip.mp4", contentType: "video/mp4" })
    );

    // Should still upload the transcoded video
    expect(mockUploadBucket).toHaveBeenCalledWith(
      expect.stringContaining("_720p.mp4"),
      expect.anything()
    );
  });

  it("aborts and cleans up if main ffmpeg transcode fails", async () => {
    mockExecSync.mockImplementationOnce(() => { throw new Error("ffmpeg fail"); });

    await capturedHandler!(
      makeEvent({ name: "sessions/s1/media/clip.mp4", contentType: "video/mp4" })
    );

    // No upload should have occurred
    expect(mockUploadBucket).not.toHaveBeenCalled();
    // Original temp file should be cleaned up
    expect(mockUnlinkSync).toHaveBeenCalled();
  });
});
