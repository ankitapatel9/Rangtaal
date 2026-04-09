import firestore from "@react-native-firebase/firestore";
import { LikeDoc } from "../types/like";

const COLLECTION = "likes";

function likeDocId(parentId: string, userId: string): string {
  return `${parentId}_${userId}`;
}

export async function toggleLike(
  parentId: string,
  parentType: LikeDoc["parentType"],
  userId: string
): Promise<void> {
  const docId = likeDocId(parentId, userId);
  const ref = firestore().collection(COLLECTION).doc(docId);
  const snap = await ref.get();

  if (snap.exists()) {
    await ref.delete();
  } else {
    await ref.set({
      id: docId,
      parentId,
      parentType,
      userId,
      createdAt: firestore.FieldValue.serverTimestamp()
    });
  }
}

export async function getLikeCount(parentId: string): Promise<number> {
  const snap = await firestore()
    .collection(COLLECTION)
    .where("parentId", "==", parentId)
    .get();
  return snap.docs.length;
}

export async function isLikedByUser(
  parentId: string,
  userId: string
): Promise<boolean> {
  const snap = await firestore()
    .collection(COLLECTION)
    .doc(likeDocId(parentId, userId))
    .get();
  return snap.exists();
}
