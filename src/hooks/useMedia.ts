import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { MediaDoc } from "../types/media";

export interface MediaState {
  media: MediaDoc[];
  loading: boolean;
}

export function useMedia(sessionId: string | undefined): MediaState {
  const [state, setState] = useState<MediaState>({
    media: [],
    loading: !!sessionId
  });

  useEffect(() => {
    if (!sessionId) {
      setState({ media: [], loading: false });
      return;
    }

    const unsub = firestore()
      .collection("media")
      .where("sessionId", "==", sessionId)
      .orderBy("uploadedAt", "desc")
      .onSnapshot(
        (snap) => {
          const media: MediaDoc[] = snap.docs.map((doc) => ({
            ...(doc.data() as Omit<MediaDoc, "id">),
            id: doc.id
          }));
          setState({ media, loading: false });
        },
        (error) => {
          console.error("useMedia onSnapshot error:", error);
          setState({ media: [], loading: false });
        }
      );

    return unsub;
  }, [sessionId]);

  return state;
}
