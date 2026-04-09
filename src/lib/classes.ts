import firestore from "@react-native-firebase/firestore";
import { ClassDoc } from "../types/class";

export async function getActiveClass(): Promise<ClassDoc | null> {
  const snap = await firestore()
    .collection("classes")
    .where("active", "==", true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { ...(doc.data() as Omit<ClassDoc, "id">), id: doc.id };
}

export interface CreateClassSeasonInput {
  name: string;
  location: string;
  address: string;
  startTime: string;
  endTime: string;
  monthlyFee: number;
  seasonStart: string;
  seasonEnd: string;
  adminUserId: string;
}

export async function createClassAndSeason(
  input: CreateClassSeasonInput
): Promise<string> {
  const db = firestore();
  const classRef = await db.collection("classes").add({
    name: input.name,
    location: input.location,
    address: input.address,
    dayOfWeek: "Tuesday",
    startTime: input.startTime,
    endTime: input.endTime,
    monthlyFee: input.monthlyFee,
    seasonStart: input.seasonStart,
    seasonEnd: input.seasonEnd,
    active: true,
    createdAt: firestore.FieldValue.serverTimestamp(),
    createdBy: input.adminUserId,
  });

  const sessionDates = generateWeeklyDates(input.seasonStart, input.seasonEnd);

  const batch = db.batch();
  for (const date of sessionDates) {
    const ref = db.collection("sessions").doc();
    batch.set(ref, {
      classId: classRef.id,
      date,
      status: "upcoming",
      rsvps: [],
      customMessage: null,
      cancellationReason: null,
      cancelledAt: null,
      cancelledBy: null,
      reminderSent: { dayBefore: false, dayOf: false },
    });
  }
  await batch.commit();

  return classRef.id;
}

function generateWeeklyDates(startIso: string, endIso: string): string[] {
  const dates: string[] = [];
  // Extract the time+offset suffix from the input (e.g., "T19:30:00-05:00")
  const timeSuffix = startIso.slice(10);
  // Parse the timezone offset to convert UTC back to local date components
  const offsetMatch = startIso.match(/([+-])(\d{2}):(\d{2})$/);
  const offsetSign = offsetMatch?.[1] === "-" ? -1 : 1;
  const offsetMs =
    offsetSign *
    (parseInt(offsetMatch?.[2] ?? "0") * 60 + parseInt(offsetMatch?.[3] ?? "0")) *
    60000;

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();

  for (let ms = startMs; ms <= endMs; ms += WEEK_MS) {
    // Shift UTC to the target timezone so getUTC* methods return local components
    const local = new Date(ms + offsetMs);
    const yyyy = local.getUTCFullYear();
    const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(local.getUTCDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}${timeSuffix}`);
  }
  return dates;
}
