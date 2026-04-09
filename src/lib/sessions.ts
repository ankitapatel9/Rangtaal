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

export async function rsvpToSession(sessionId: string, userId: string): Promise<void> {
  await firestore()
    .collection("sessions")
    .doc(sessionId)
    .update({
      rsvps: firestore.FieldValue.arrayUnion(userId),
    });
}
