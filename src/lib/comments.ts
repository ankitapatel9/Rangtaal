import firestore from "@react-native-firebase/firestore";
import { CommentDoc } from "../types/comment";

const COLLECTION = "comments";

export interface AddCommentInput {
  parentId: string;
  parentType: CommentDoc["parentType"];
  replyToId: string | null;
  userId: string;
  userName: string;
  text: string;
}

export async function addComment(input: AddCommentInput): Promise<void> {
  await firestore().collection(COLLECTION).add({
    parentId: input.parentId,
    parentType: input.parentType,
    replyToId: input.replyToId,
    userId: input.userId,
    userName: input.userName,
    text: input.text,
    createdAt: firestore.FieldValue.serverTimestamp()
  });
}

export async function getComments(parentId: string): Promise<CommentDoc[]> {
  const snap = await firestore()
    .collection(COLLECTION)
    .where("parentId", "==", parentId)
    .orderBy("createdAt", "asc")
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CommentDoc));
}

export async function deleteComment(commentId: string): Promise<void> {
  await firestore().collection(COLLECTION).doc(commentId).delete();
}
