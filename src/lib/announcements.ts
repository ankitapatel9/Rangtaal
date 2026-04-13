import firestore from "@react-native-firebase/firestore";
import { AnnouncementDoc } from "../types/announcement";

export async function createAnnouncement(input: {
  text: string;
  createdBy: string;
}): Promise<string> {
  const ref = await firestore().collection("announcements").add({
    text: input.text,
    createdBy: input.createdBy,
    createdAt: firestore.FieldValue.serverTimestamp(),
    expiresAt: null,
    active: true,
  });
  return ref.id;
}

export async function getActiveAnnouncements(): Promise<AnnouncementDoc[]> {
  const snap = await firestore()
    .collection("announcements")
    .where("active", "==", true)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => ({
    ...(doc.data() as Omit<AnnouncementDoc, "id">),
    id: doc.id,
  }));
}

export async function dismissAnnouncement(id: string): Promise<void> {
  await firestore().collection("announcements").doc(id).update({
    active: false,
  });
}
