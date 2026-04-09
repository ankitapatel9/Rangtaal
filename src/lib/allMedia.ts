import firestore from "@react-native-firebase/firestore";
import { MediaDoc } from "../types/media";

export async function getAllMedia(): Promise<MediaDoc[]> {
  const snap = await firestore()
    .collection("media")
    .orderBy("uploadedAt", "desc")
    .get();

  return snap.docs.map((doc) => ({
    ...(doc.data() as Omit<MediaDoc, "id">),
    id: doc.id,
  }));
}
