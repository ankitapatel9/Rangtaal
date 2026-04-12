import firestore from "@react-native-firebase/firestore";
import { CreateMediaInput, MediaDoc } from "../types/media";

export async function getMediaForSession(sessionId: string): Promise<MediaDoc[]> {
  const snap = await firestore()
    .collection("media")
    .where("sessionId", "==", sessionId)
    .orderBy("uploadedAt", "desc")
    .get();

  return snap.docs.map((doc) => ({
    ...(doc.data() as Omit<MediaDoc, "id">),
    id: doc.id
  }));
}

export async function createMedia(input: CreateMediaInput & { title?: string }): Promise<string> {
  const ref = await firestore().collection("media").add({
    sessionId: input.sessionId,
    type: input.type,
    title: input.title ?? "",
    storageUrl: input.storageUrl,
    uploadedBy: input.uploadedBy,
    uploadedAt: firestore.FieldValue.serverTimestamp(),
    comments: null,
    tags: null,
    analysis: null,
  });
  return ref.id;
}

export async function updateMedia(
  mediaId: string,
  updates: { title?: string }
): Promise<void> {
  await firestore().collection("media").doc(mediaId).update(updates);
}

export async function deleteMedia(mediaId: string): Promise<void> {
  await firestore().collection("media").doc(mediaId).delete();
}
