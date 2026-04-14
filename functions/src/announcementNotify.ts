import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { notifyAllUsers } from "./notify";

export const onAnnouncementCreated = onDocumentCreated(
  "announcements/{announcementId}",
  async (event) => {
    const data = event.data?.data();
    if (!data || !data.active) return;

    await notifyAllUsers(
      {
        type: "announcement",
        title: "📢 Announcement",
        body: data.text,
        route: "/",
      },
      data.createdBy // Don't notify the admin who posted it
    );
  }
);
