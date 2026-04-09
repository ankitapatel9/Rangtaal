import { useEffect } from "react";
import messaging from "@react-native-firebase/messaging";
import firestore from "@react-native-firebase/firestore";

export function useNotifications(uid: string | undefined): void {
  useEffect(() => {
    if (!uid) return;

    async function register() {
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        if (!enabled) return;

        await messaging().registerDeviceForRemoteMessages();
        const token = await messaging().getToken();
        if (token) {
          await firestore().collection("users").doc(uid).update({ fcmToken: token });
        }
      } catch {
        // APNs entitlement may be missing in development builds.
        // Notifications will work after an EAS Build with the entitlement.
      }
    }

    register();

    let unsubRefresh: (() => void) | undefined;
    try {
      unsubRefresh = messaging().onTokenRefresh(async (newToken) => {
        await firestore().collection("users").doc(uid!).update({ fcmToken: newToken });
      });
    } catch {
      // Silently skip if messaging isn't available
    }

    return () => unsubRefresh?.();
  }, [uid]);
}
