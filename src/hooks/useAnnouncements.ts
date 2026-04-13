import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { AnnouncementDoc } from "../types/announcement";

export interface UseAnnouncementsState {
  announcements: AnnouncementDoc[];
  loading: boolean;
}

export function useAnnouncements(): UseAnnouncementsState {
  const [state, setState] = useState<UseAnnouncementsState>({
    announcements: [],
    loading: true,
  });

  useEffect(() => {
    const unsub = firestore()
      .collection("announcements")
      .where("active", "==", true)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snap) => {
          if (!snap) return;
          const announcements = snap.docs.map((d) => ({
            ...(d.data() as Omit<AnnouncementDoc, "id">),
            id: d.id,
          }));
          setState({ announcements, loading: false });
        },
        () => {
          // Silently handle — index may still be building
          setState({ announcements: [], loading: false });
        }
      );
    return unsub;
  }, []);

  return state;
}
