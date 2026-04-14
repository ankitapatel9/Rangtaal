import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { notifyAllUsers } from "./notify";

export const onMediaCreated = onDocumentCreated(
  "media/{mediaId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const isVideo = data.type === "video";
    await notifyAllUsers(
      {
        type: "media_uploaded",
        title: isVideo ? "🎥 New Video" : "📸 New Photo",
        body: "New content was shared in the community",
        route: `/session/${data.sessionId}`,
      },
      data.uploadedBy
    );
  }
);
