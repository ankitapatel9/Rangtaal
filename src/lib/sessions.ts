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

export async function removeRsvp(sessionId: string, userId: string): Promise<void> {
  await firestore()
    .collection("sessions")
    .doc(sessionId)
    .update({
      rsvps: firestore.FieldValue.arrayRemove(userId),
    });
}

export async function cancelSession(
  sessionId: string,
  reason: string,
  adminUid: string
): Promise<void> {
  await firestore().collection("sessions").doc(sessionId).update({
    status: "cancelled",
    cancellationReason: reason,
    cancelledAt: firestore.FieldValue.serverTimestamp(),
    cancelledBy: adminUid,
  });
}

export async function updateSessionTopic(
  sessionId: string,
  topic: string,
  topicDescription: string
): Promise<void> {
  await firestore().collection("sessions").doc(sessionId).update({
    topic,
    topicDescription,
  });
}
