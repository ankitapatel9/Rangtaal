import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../src/hooks/useAuth";
import { useUser } from "../src/hooks/useUser";

export default function RootLayout() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { user: userDoc, loading: userLoading } = useUser(authUser?.uid);
  const segments = useSegments();
  const router = useRouter();

  const loading = authLoading || (!!authUser && userLoading);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inParticipantGroup = segments[0] === "(participant)";
    const inAdminGroup = segments[0] === "(admin)";
    const inSessionRoute = segments[0] === "session";

    if (!authUser) {
      if (!inAuthGroup) router.replace("/(auth)/login" as any);
      return;
    }

    if (authUser && !userDoc) {
      if ((segments as string[])[1] !== "welcome") router.replace("/(auth)/welcome" as any);
      return;
    }

    // Shared routes like /session/[id] are accessible to both roles
    // — skip the role-group redirect if the user is already on one.
    if (inSessionRoute) return;

    if (userDoc?.role === "admin") {
      if (!inAdminGroup) router.replace("/(admin)/home" as any);
    } else {
      if (!inParticipantGroup) router.replace("/(participant)/home" as any);
    }
  }, [authUser, userDoc, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
