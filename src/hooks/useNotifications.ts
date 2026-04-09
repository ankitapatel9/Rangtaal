import { useEffect } from "react";
import messaging from "@react-native-firebase/messaging";
import firestore from "@react-native-firebase/firestore";

export function useNotifications(uid: string | undefined): void {
  useEffect(() => {
    if (!uid) return;

    async function register() {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled) return;

      const token = await messaging().getToken();
      if (token) {
        await firestore().collection("users").doc(uid).update({ fcmToken: token });
      }
    }

    register();

    const unsubRefresh = messaging().onTokenRefresh(async (newToken) => {
      await firestore().collection("users").doc(uid!).update({ fcmToken: newToken });
    });

    return unsubRefresh;
  }, [uid]);
}
