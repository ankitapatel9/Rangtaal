import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { AnnouncementDoc } from "../types/announcement";
import { toEpochMs } from "../lib/formatTime";

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
    // Query all announcements and filter/sort client-side
    // Avoids the composite index requirement (active + createdAt)
    const unsub = firestore()
      .collection("announcements")
      .onSnapshot(
        (snap) => {
          if (!snap) return;
          const all = snap.docs.map((d) => ({
            ...(d.data() as Omit<AnnouncementDoc, "id">),
            id: d.id,
          }));
          // Filter active and sort newest first
          const active = all
            .filter((a) => a.active)
            .sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));
          setState({ announcements: active, loading: false });
        },
        () => {
          setState({ announcements: [], loading: false });
        }
      );
    return unsub;
  }, []);

  return state;
}
