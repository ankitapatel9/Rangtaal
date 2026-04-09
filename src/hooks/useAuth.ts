import { useEffect, useState } from "react";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";

export interface AuthState {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const unsub = auth().onAuthStateChanged((u) => {
      setState({ user: u, loading: false });
    });
    return unsub;
  }, []);

  return state;
}
