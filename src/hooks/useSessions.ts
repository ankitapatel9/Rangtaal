import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { SessionDoc } from "../types/session";

export interface UseSessionsState {
  sessions: SessionDoc[];
  loading: boolean;
}

export function useSessions(classId: string | undefined): UseSessionsState {
  const [state, setState] = useState<UseSessionsState>({
    sessions: [],
    loading: !!classId,
  });

  useEffect(() => {
    if (!classId) {
      setState({ sessions: [], loading: false });
      return;
    }
    const unsub = firestore()
      .collection("sessions")
      .where("classId", "==", classId)
      .orderBy("date", "asc")
      .onSnapshot((snap) => {
        const sessions = snap.docs.map((d) => ({
          ...(d.data() as Omit<SessionDoc, "id">),
          id: d.id,
        }));
        setState({ sessions, loading: false });
      });
    return unsub;
  }, [classId]);

  return state;
}
