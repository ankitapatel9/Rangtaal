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
