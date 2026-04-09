import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { UserDoc } from "../types/user";

export interface UserState {
  user: UserDoc | null;
  loading: boolean;
}

export function useUser(uid: string | undefined): UserState {
  const [state, setState] = useState<UserState>({ user: null, loading: !!uid });

  useEffect(() => {
    if (!uid) {
      setState({ user: null, loading: false });
      return;
    }
    const unsub = firestore()
      .collection("users")
      .doc(uid)
      .onSnapshot((snap) => {
        if (snap.exists()) {
          setState({ user: snap.data() as UserDoc, loading: false });
        } else {
          setState({ user: null, loading: false });
        }
      });
    return unsub;
  }, [uid]);

  return state;
}
