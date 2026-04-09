import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { TutorialDoc } from "../types/tutorial";

export interface TutorialsState {
  tutorials: TutorialDoc[];
  loading: boolean;
}

export function useTutorials(sessionId: string | undefined): TutorialsState {
  const [state, setState] = useState<TutorialsState>({
    tutorials: [],
    loading: !!sessionId
  });

  useEffect(() => {
    if (!sessionId) {
      setState({ tutorials: [], loading: false });
      return;
    }

    const unsub = firestore()
      .collection("tutorials")
      .where("sessionId", "==", sessionId)
      .orderBy("order", "asc")
      .onSnapshot(
        (snap) => {
          const tutorials: TutorialDoc[] = snap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<TutorialDoc, "id">)
          }));
          setState({ tutorials, loading: false });
        },
        (err) => {
          console.error("useTutorials onSnapshot error:", err);
          setState({ tutorials: [], loading: false });
        }
      );

    return unsub;
  }, [sessionId]);

  return state;
}
