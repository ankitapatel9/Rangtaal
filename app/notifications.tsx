import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/hooks/useAuth";
import { colors } from "../src/theme/colors";

// For MVP, show a clean empty state. Real notifications come from the
// `notifications` Firestore collection once Cloud Functions are deployed.

export default function NotificationsScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Empty state */}
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySub}>
            You'll get notified about session reminders, new tutorials, and community activity.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBackground },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.primary },
  content: { padding: 20, paddingBottom: 40 },
  emptyState: { alignItems: "center", marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.primary, marginTop: 16 },
  emptySub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 32,
  },
});
