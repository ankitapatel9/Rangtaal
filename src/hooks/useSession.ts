import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { SessionDoc } from "../types/session";

export interface UseSessionState {
  session: SessionDoc | null;
  loading: boolean;
}

export function useSession(id: string | undefined): UseSessionState {
  const [state, setState] = useState<UseSessionState>({
    session: null,
    loading: !!id,
  });

  useEffect(() => {
    if (!id) {
      setState({ session: null, loading: false });
      return;
    }
    const unsub = firestore()
      .collection("sessions")
      .doc(id)
      .onSnapshot((snap) => {
        if (!snap.exists()) {
          setState({ session: null, loading: false });
          return;
        }
        setState({
          session: { ...(snap.data() as Omit<SessionDoc, "id">), id: snap.id },
          loading: false,
        });
      });
    return unsub;
  }, [id]);

  return state;
}
