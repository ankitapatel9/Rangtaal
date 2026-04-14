import * as admin from "firebase-admin";

export interface NotifyInput {
  userId: string;        // recipient
  type: string;          // "announcement" | "session_reminder" | "session_cancelled" | "tutorial_uploaded" | "media_uploaded"
  title: string;
  body: string;
  route: string;         // deep link route
}

/**
 * Writes a notification doc to Firestore only (no FCM).
 * Use this in functions that already handle FCM/SMS themselves.
 */
export async function createNotificationDoc(input: NotifyInput): Promise<void> {
  await admin.firestore().collection("notifications").add({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    route: input.route,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Creates a notification doc AND sends an FCM push.
 * Use this for new event triggers (announcement, tutorial, media).
 */
export async function notifyUser(input: NotifyInput): Promise<void> {
  // 1. Create notification doc in Firestore
  await createNotificationDoc(input);

  // 2. Send push notification via FCM
  const userDoc = await admin.firestore().collection("users").doc(input.userId).get();
  const fcmToken = userDoc.data()?.fcmToken;

  if (fcmToken) {
    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title: input.title,
          body: input.body,
        },
        data: {
          route: input.route,
          type: input.type,
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      });
    } catch (err: any) {
      // Token might be invalid — log but don't fail
      console.error(`FCM send failed for ${input.userId}:`, err.message);
    }
  }
}

export async function notifyAllUsers(
  input: Omit<NotifyInput, "userId">,
  excludeUserId?: string
): Promise<void> {
  const usersSnap = await admin.firestore().collection("users").get();
  const promises = usersSnap.docs
    .filter((doc) => doc.id !== excludeUserId)
    .map((doc) => notifyUser({ ...input, userId: doc.id }));
  await Promise.all(promises);
}
