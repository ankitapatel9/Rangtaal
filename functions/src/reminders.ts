import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { sendSms } from "./sms";

type ReminderType = "dayBefore" | "dayOf";

interface SessionData {
  date: string;
  time: string;
  location: string;
  status: string;
  rsvps: string[];
  reminderSent: {
    dayBefore: boolean;
    dayOf: boolean;
  };
}

interface UserData {
  uid: string;
  name: string;
  phoneNumber: string;
  fcmToken: string | null;
}

function getTargetDate(type: ReminderType): string {
  const d = new Date();
  if (type === "dayBefore") {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

export async function processReminders(type: ReminderType): Promise<void> {
  const db = admin.firestore();
  const targetDate = getTargetDate(type);
  const reminderField = `reminderSent.${type}`;
  const timeLabel = type === "dayBefore" ? "tomorrow" : "tonight";

  // Query sessions matching target date, upcoming status, and not yet reminded
  const sessionsSnap = await db
    .collection("sessions")
    .where("status", "==", "upcoming")
    .where(reminderField, "==", false)
    .get();

  // Filter to sessions whose date starts with our target date
  const matchingSessions = sessionsSnap.docs.filter((doc) => {
    const data = doc.data() as SessionData;
    return data.date.startsWith(targetDate);
  });

  if (matchingSessions.length === 0) return;

  // Get all users
  const usersSnap = await db.collection("users").get();
  const allUsers = usersSnap.docs.map((doc) => doc.data() as UserData);

  for (const sessionDoc of matchingSessions) {
    const session = sessionDoc.data() as SessionData;
    const rsvpSet = new Set(session.rsvps);

    for (const user of allUsers) {
      const isRsvpd = rsvpSet.has(user.uid);
      const message = isRsvpd
        ? `Reminder: you're signed up for Garba ${timeLabel} at ${session.time} at ${session.location}`
        : `${timeLabel === "tomorrow" ? "Tomorrow's" : "Tonight's"} Garba session is at ${session.time} — RSVP if you're coming!`;

      if (user.fcmToken) {
        await admin.messaging().send({
          token: user.fcmToken,
          notification: {
            title: "Rangtaal",
            body: message,
          },
        });
      } else {
        await sendSms(user.phoneNumber, message);
      }
    }

    // Mark reminder as sent
    await db
      .collection("sessions")
      .doc(sessionDoc.id)
      .update({ [reminderField]: true });
  }
}

export const sendDayBeforeReminders = onSchedule(
  { schedule: "0 19 * * *", timeZone: "America/Chicago" },
  async () => {
    await processReminders("dayBefore");
  }
);

export const sendDayOfReminders = onSchedule(
  { schedule: "30 17 * * *", timeZone: "America/Chicago" },
  async () => {
    await processReminders("dayOf");
  }
);
