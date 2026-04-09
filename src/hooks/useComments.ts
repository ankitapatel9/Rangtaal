import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { CommentDoc } from "../types/comment";

export type ThreadedComment = CommentDoc & { replies: CommentDoc[] };

export interface CommentsState {
  comments: ThreadedComment[];
  loading: boolean;
}

export function useComments(parentId: string): CommentsState {
  const [comments, setComments] = useState<ThreadedComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = firestore()
      .collection("comments")
      .where("parentId", "==", parentId)
      .orderBy("createdAt", "asc")
      .onSnapshot((snap) => {
        const allDocs: CommentDoc[] = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        } as CommentDoc));

        // Build threaded structure: top-level + nested replies
        const topLevel = allDocs.filter((c) => c.replyToId === null);

        const threaded: ThreadedComment[] = topLevel.map((c) => ({
          ...c,
          replies: []
        }));

        const threadedMap = new Map(threaded.map((t) => [t.id, t]));

        for (const doc of allDocs) {
          if (doc.replyToId !== null && threadedMap.has(doc.replyToId)) {
            threadedMap.get(doc.replyToId)!.replies.push(doc);
          }
        }

        setComments(threaded);
        setLoading(false);
      });

    return unsub;
  }, [parentId]);

  return { comments, loading };
}
