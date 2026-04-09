import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { ClassDoc } from "../types/class";

export interface UseActiveClassState {
  class_: ClassDoc | null;
  loading: boolean;
}

export function useActiveClass(): UseActiveClassState {
  const [state, setState] = useState<UseActiveClassState>({
    class_: null,
    loading: true,
  });

  useEffect(() => {
    const unsub = firestore()
      .collection("classes")
      .where("active", "==", true)
      .limit(1)
      .onSnapshot(
        (snap) => {
          if (!snap || snap.empty) {
            setState({ class_: null, loading: false });
            return;
          }
          const doc = snap.docs[0];
          setState({
            class_: { ...(doc.data() as Omit<ClassDoc, "id">), id: doc.id },
            loading: false,
          });
        },
        (err) => {
          console.error("useActiveClass error:", err);
          setState({ class_: null, loading: false });
        }
      );
    return unsub;
  }, []);

  return state;
}
