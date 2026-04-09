import firestore from "@react-native-firebase/firestore";
import { NewUserInput, UserDoc } from "../types/user";

export async function createUserDoc(input: NewUserInput): Promise<void> {
  const ref = firestore().collection("users").doc(input.uid);
  await ref.set({
    uid: input.uid,
    name: input.name,
    phoneNumber: input.phoneNumber,
    role: "participant",
    paid: false,
    createdAt: firestore.FieldValue.serverTimestamp()
  });
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await firestore().collection("users").doc(uid).get();
  if (!snap.exists()) return null;
  return snap.data() as UserDoc;
}
