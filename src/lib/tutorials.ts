import firestore from "@react-native-firebase/firestore";
import { TutorialDoc, CreateTutorialInput } from "../types/tutorial";

export async function getTutorialsForSession(
  sessionId: string
): Promise<TutorialDoc[]> {
  const snap = await firestore()
    .collection("tutorials")
    .where("sessionId", "==", sessionId)
    .orderBy("order", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<TutorialDoc, "id">) }));
}

export async function createTutorial(
  input: CreateTutorialInput
): Promise<void> {
  await firestore()
    .collection("tutorials")
    .add({
      sessionId: input.sessionId,
      title: input.title,
      description: input.description,
      videoUrl: input.videoUrl,
      thumbnailUrl: input.thumbnailUrl,
      createdAt: firestore.FieldValue.serverTimestamp(),
      createdBy: input.createdBy,
      order: input.order
    });
}

export async function deleteTutorial(tutorialId: string): Promise<void> {
  await firestore().collection("tutorials").doc(tutorialId).delete();
}
