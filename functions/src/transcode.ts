import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import { execSync } from "child_process";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

// Initialize admin if not already done
if (!admin.apps.length) admin.initializeApp();

const storage = admin.storage();
const firestore = admin.firestore();

export const onVideoUploaded = onObjectFinalized(
  { bucket: "rangtaal-app.firebasestorage.app", memory: "1GiB", timeoutSeconds: 300 },
  async (event) => {
    const filePath = event.data.name;
    if (!filePath) return;

    // Only process videos in sessions/*/media/ or tutorials/
    const isSessionMedia = filePath.startsWith("sessions/") && filePath.includes("/media/");
    const isTutorial = filePath.startsWith("tutorials/");
    if (!isSessionMedia && !isTutorial) return;

    // Skip if already a processed file (720p or thumbnail)
    if (
      filePath.includes("_720p") ||
      filePath.includes("_thumb") ||
      filePath.startsWith("thumbnails/")
    ) return;

    const contentType = event.data.contentType ?? "";

    const bucket = storage.bucket(event.data.bucket);
    const tempDir = os.tmpdir();
    const originalFileName = path.basename(filePath);
    const baseName = path.parse(originalFileName).name;
    const dir = path.dirname(filePath);

    const tempOriginalPath = path.join(tempDir, originalFileName);

    // Download original
    await bucket.file(filePath).download({ destination: tempOriginalPath });

    // Make original publicly accessible and record its URL
    const originalFile = bucket.file(filePath);
    await originalFile.makePublic();
    const originalUrl = `https://storage.googleapis.com/${event.data.bucket}/${filePath}`;

    // ── VIDEO BRANCH ──────────────────────────────────────────────────────────
    if (contentType.startsWith("video/")) {
      const transcodedFileName = `${baseName}_720p.mp4`;
      const tempTranscodedPath = path.join(tempDir, transcodedFileName);

      try {
        execSync(
          `ffmpeg -i "${tempOriginalPath}" -vf "scale=-2:720" -c:v libx264 -preset fast -crf 28 -c:a aac -b:a 128k -movflags +faststart -y "${tempTranscodedPath}"`,
          { stdio: "pipe", timeout: 240000 }
        );
      } catch (err) {
        console.error("FFmpeg transcode failed:", err);
        fs.unlinkSync(tempOriginalPath);
        return;
      }

      // Generate thumbnail
      const thumbFileName = `${baseName}_thumb.jpg`;
      const tempThumbPath = path.join(tempDir, thumbFileName);

      try {
        execSync(
          `ffmpeg -i "${tempOriginalPath}" -ss 00:00:01 -frames:v 1 -vf "scale=-2:720" -y "${tempThumbPath}"`,
          { stdio: "pipe", timeout: 30000 }
        );
      } catch {
        console.error("Thumbnail generation failed, continuing without thumbnail");
      }

      // Upload 720p version
      const transcodedPath = `${dir}/${transcodedFileName}`;
      await bucket.upload(tempTranscodedPath, {
        destination: transcodedPath,
        metadata: { contentType: "video/mp4" },
      });

      const transcodedFile = bucket.file(transcodedPath);
      await transcodedFile.makePublic();
      const transcodedUrl = `https://storage.googleapis.com/${event.data.bucket}/${transcodedPath}`;

      // Upload thumbnail if generated
      let thumbnailUrl: string | null = null;
      if (fs.existsSync(tempThumbPath)) {
        const thumbPath = `thumbnails/${baseName}_thumb.jpg`;
        await bucket.upload(tempThumbPath, {
          destination: thumbPath,
          metadata: { contentType: "image/jpeg" },
        });
        const thumbFile = bucket.file(thumbPath);
        await thumbFile.makePublic();
        thumbnailUrl = `https://storage.googleapis.com/${event.data.bucket}/${thumbPath}`;
      }

      // Update Firestore — media collection
      const mediaSnap = await firestore
        .collection("media")
        .where("storageUrl", "==", originalUrl)
        .limit(1)
        .get();

      if (!mediaSnap.empty) {
        const doc = mediaSnap.docs[0];
        const updates: Record<string, string | null> = {
          storageUrl: transcodedUrl,
          originalUrl: originalUrl,
        };
        if (thumbnailUrl) updates.thumbnailUrl = thumbnailUrl;
        await doc.ref.update(updates);
        console.log(`Updated media doc ${doc.id} with 720p URL`);
      }

      // Update Firestore — tutorials collection
      const tutorialSnap = await firestore
        .collection("tutorials")
        .where("videoUrl", "==", originalUrl)
        .limit(1)
        .get();

      if (!tutorialSnap.empty) {
        const doc = tutorialSnap.docs[0];
        const updates: Record<string, string | null> = {
          videoUrl: transcodedUrl,
          originalUrl: originalUrl,
        };
        if (thumbnailUrl) updates.thumbnailUrl = thumbnailUrl;
        await doc.ref.update(updates);
        console.log(`Updated tutorial doc ${doc.id} with 720p URL`);
      }

      // Clean up
      [tempOriginalPath, tempTranscodedPath, tempThumbPath].forEach((f) => {
        try { fs.unlinkSync(f); } catch {}
      });

      console.log(`Transcoding complete for ${filePath}`);
      return;
    }

    // ── IMAGE BRANCH ──────────────────────────────────────────────────────────
    if (contentType.startsWith("image/")) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require("sharp");
      const resizedPath = path.join(tempDir, `${baseName}_1080.jpg`);

      try {
        await sharp(tempOriginalPath)
          .resize(1080, null, { withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(resizedPath);
      } catch (err) {
        console.error("Sharp resize failed:", err);
        fs.unlinkSync(tempOriginalPath);
        return;
      }

      const resizedStoragePath = `${dir}/${baseName}_1080.jpg`;
      await bucket.upload(resizedPath, {
        destination: resizedStoragePath,
        metadata: { contentType: "image/jpeg" },
      });
      const resizedFile = bucket.file(resizedStoragePath);
      await resizedFile.makePublic();
      const resizedUrl = `https://storage.googleapis.com/${event.data.bucket}/${resizedStoragePath}`;

      // Update Firestore — media collection
      const photoSnap = await firestore
        .collection("media")
        .where("storageUrl", "==", originalUrl)
        .limit(1)
        .get();

      if (!photoSnap.empty) {
        await photoSnap.docs[0].ref.update({
          storageUrl: resizedUrl,
          originalUrl: originalUrl,
        });
        console.log(`Updated media doc ${photoSnap.docs[0].id} with resized image URL`);
      }

      // Clean up
      [tempOriginalPath, resizedPath].forEach((f) => {
        try { fs.unlinkSync(f); } catch {}
      });

      console.log(`Image resize complete for ${filePath}`);
    }
  }
);
