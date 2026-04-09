import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { UserDoc } from "../types/user";

export interface UseAllUsersState {
  users: UserDoc[];
  loading: boolean;
}

export function useAllUsers(): UseAllUsersState {
  const [state, setState] = useState<UseAllUsersState>({ users: [], loading: true });

  useEffect(() => {
    const unsub = firestore()
      .collection("users")
      .orderBy("name", "asc")
      .onSnapshot(
        (snap) => {
          if (!snap) return;
          const users = snap.docs.map((d) => ({ ...(d.data() as UserDoc), uid: d.id }));
          setState({ users, loading: false });
        },
        (err) => {
          console.error("useAllUsers error:", err);
          setState({ users: [], loading: false });
        }
      );
    return unsub;
  }, []);

  return state;
}
