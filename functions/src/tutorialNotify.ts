import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { notifyAllUsers } from "./notify";

export const onTutorialCreated = onDocumentCreated(
  "tutorials/{tutorialId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    await notifyAllUsers(
      {
        type: "tutorial_uploaded",
        title: "🎥 New Tutorial",
        body: data.title || "A new tutorial was uploaded",
        route: `/session/${data.sessionId}`,
      },
      data.createdBy
    );
  }
);
