import { useEffect } from "react";
import { useRouter } from "expo-router";

/**
 * Catch-all for unmatched routes.
 *
 * This primarily handles Firebase reCAPTCHA callbacks which come in as:
 *   com.googleusercontent.apps.xxx://firebaseauth/link?deep_link_id=...
 *
 * Expo Router intercepts these URLs because the scheme is registered,
 * but there's no matching file route. Instead of showing "Unmatched Route",
 * we silently redirect back to the app. Firebase Auth SDK handles the
 * callback internally via its own URL listener.
 */
export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Give Firebase Auth a moment to process the callback URL,
    // then redirect back to the app
    const timer = setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/" as any);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Return null — don't show any UI for the brief redirect
  return null;
}
