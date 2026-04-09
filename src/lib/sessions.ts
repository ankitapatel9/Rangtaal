import firestore from "@react-native-firebase/firestore";
import { SessionDoc } from "../types/session";

export async function getSessionsForClass(classId: string): Promise<SessionDoc[]> {
  const snap = await firestore()
    .collection("sessions")
    .where("classId", "==", classId)
    .orderBy("date", "asc")
    .get();
  return snap.docs.map((doc) => ({
    ...(doc.data() as Omit<SessionDoc, "id">),
    id: doc.id,
  }));
}
