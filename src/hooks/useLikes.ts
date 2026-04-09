import { useCallback, useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { toggleLike } from "../lib/likes";
import { LikeDoc } from "../types/like";

export interface LikesState {
  count: number;
  isLiked: boolean;
  toggle: () => Promise<void>;
}

export function useLikes(
  parentId: string,
  userId: string,
  parentType: LikeDoc["parentType"] = "media"
): LikesState {
  const [count, setCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    // Subscription 1: count of all likes on parentId
    const unsubCount = firestore()
      .collection("likes")
      .where("parentId", "==", parentId)
      .onSnapshot((snap) => {
        setCount(snap.docs.length);
      });

    // Subscription 2: user's own like doc
    const likeDocId = `${parentId}_${userId}`;
    const unsubUser = firestore()
      .collection("likes")
      .doc(likeDocId)
      .onSnapshot((snap) => {
        setIsLiked(snap.exists());
      });

    return () => {
      unsubCount();
      unsubUser();
    };
  }, [parentId, userId]);

  const toggle = useCallback(async () => {
    await toggleLike(parentId, parentType, userId);
  }, [parentId, parentType, userId]);

  return { count, isLiked, toggle };
}
