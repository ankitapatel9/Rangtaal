import firestore from "@react-native-firebase/firestore";

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
