import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { MediaDoc } from "../types/media";

export interface AllMediaState {
  media: MediaDoc[];
  loading: boolean;
}

export function useAllMedia(): AllMediaState {
  const [state, setState] = useState<AllMediaState>({
    media: [],
    loading: true,
  });

  useEffect(() => {
    const unsub = firestore()
      .collection("media")
      .orderBy("uploadedAt", "desc")
      .onSnapshot(
        (snap) => {
          const media: MediaDoc[] = snap.docs.map((doc) => ({
            ...(doc.data() as Omit<MediaDoc, "id">),
            id: doc.id,
          }));
          setState({ media, loading: false });
        },
        (error) => {
          console.error("useAllMedia onSnapshot error:", error);
          setState({ media: [], loading: false });
        }
      );

    return unsub;
  }, []);

  return state;
}
