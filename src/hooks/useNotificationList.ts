import { useState, useEffect } from "react";
import firestore, { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

export interface NotificationDoc {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  route: string;
  read: boolean;
  createdAt: FirebaseFirestoreTypes.Timestamp | null;
}

export function useNotificationList(uid: string | undefined): {
  notifications: NotificationDoc[];
  loading: boolean;
  markRead: (id: string) => Promise<void>;
} {
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const unsub = firestore()
      .collection("notifications")
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .onSnapshot(
        (snap) => {
          const docs = snap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<NotificationDoc, "id">),
          }));
          setNotifications(docs);
          setLoading(false);
        },
        () => {
          setLoading(false);
        }
      );

    return unsub;
  }, [uid]);

  async function markRead(id: string): Promise<void> {
    await firestore().collection("notifications").doc(id).update({ read: true });
  }

  return { notifications, loading, markRead };
}
