import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { sendSms } from "./sms";
import { createNotificationDoc } from "./notify";

interface SessionData {
  status: string;
  rsvps: string[];
  cancellationReason?: string;
}

interface UserData {
  uid: string;
  name: string;
  phoneNumber: string;
  fcmToken: string | null;
}

interface CancellationEvent {
  data: {
    before: { data: () => SessionData };
    after: { data: () => SessionData };
  } | null;
}

export async function handleSessionCancelled(event: CancellationEvent): Promise<void> {
  if (!event.data) return;

  const before = event.data.before.data();
  const after = event.data.after.data();

  if (!before || !after) return;
  if (before.status !== "upcoming" || after.status !== "cancelled") return;

  const rsvpSet = new Set(after.rsvps);
  const reason = after.cancellationReason ?? "No reason provided";
  const message = `Tonight's Garba session has been cancelled. Reason: ${reason}`;

  const db = admin.firestore();
  const usersSnap = await db.collection("users").get();

  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data() as UserData;
    if (!rsvpSet.has(user.uid)) continue;

    // Create in-app notification doc
    await createNotificationDoc({
      userId: user.uid,
      type: "session_cancelled",
      title: "Garba Session Cancelled",
      body: message,
      route: "/",
    });

    // Send push or SMS
    if (user.fcmToken) {
      await admin.messaging().send({
        token: user.fcmToken,
        notification: {
          title: "Garba Session Cancelled",
          body: message,
        },
      });
    } else {
      await sendSms(user.phoneNumber, message);
    }
  }
}

export const onSessionCancelled = onDocumentUpdated(
  "sessions/{sessionId}",
  async (event) => {
    await handleSessionCancelled(event as unknown as CancellationEvent);
  }
);
