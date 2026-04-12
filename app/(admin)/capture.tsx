import { useEffect } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useActiveClass } from "../../src/hooks/useActiveClass";
import { useSessions } from "../../src/hooks/useSessions";
import { colors } from "../../src/theme/colors";

export default function CaptureTab() {
  const router = useRouter();
  const { class_ } = useActiveClass();
  const { sessions } = useSessions(class_?.id);

  useEffect(() => {
    // Find the nearest session (today or most recent)
    const now = Date.now();
    const sorted = [...sessions].sort(
      (a, b) =>
        Math.abs(new Date(a.date).getTime() - now) -
        Math.abs(new Date(b.date).getTime() - now)
    );
    const nearest = sorted[0];

    if (nearest) {
      const dateLabel = new Date(nearest.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      router.replace({
        pathname: "/camera",
        params: { sessionId: nearest.id, sessionDate: dateLabel + " Session" },
      } as any);
    } else {
      Alert.alert("No Sessions", "Create a class first to start capturing.");
      router.back();
    }
  }, [sessions]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Opening camera...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.pageBackground,
  },
  text: { color: colors.textSecondary },
});
