import firestore from "@react-native-firebase/firestore";
import { NewUserInput } from "../types/user";

export async function createUserDoc(input: NewUserInput): Promise<void> {
  const ref = firestore().collection("users").doc(input.uid);
  await ref.set({
    uid: input.uid,
    name: input.name,
    phoneNumber: input.phoneNumber,
    role: "participant",
    createdAt: firestore.FieldValue.serverTimestamp()
  });
}
