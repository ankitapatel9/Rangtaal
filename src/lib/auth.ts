import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";

export type ConfirmationResult = FirebaseAuthTypes.ConfirmationResult;

export async function signInWithPhone(phoneE164: string): Promise<ConfirmationResult> {
  return auth().signInWithPhoneNumber(phoneE164);
}

export async function confirmCode(
  confirmation: ConfirmationResult,
  code: string
): Promise<FirebaseAuthTypes.UserCredential | null> {
  return confirmation.confirm(code);
}

export async function signOut(): Promise<void> {
  await auth().signOut();
}
