import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/hooks/useAuth";
import { useNotificationList, NotificationDoc } from "../src/hooks/useNotificationList";
import { colors } from "../src/theme/colors";

const TYPE_ICONS: Record<string, { name: React.ComponentProps<typeof Ionicons>["name"]; color: string }> = {
  announcement: { name: "megaphone-outline", color: colors.accent },
  session_reminder: { name: "calendar-outline", color: colors.primary },
  session_cancelled: { name: "close-circle-outline", color: colors.destructive },
  tutorial_uploaded: { name: "play-circle-outline", color: colors.green },
  media_uploaded: { name: "images-outline", color: colors.orange },
};

function formatTime(ts: NotificationDoc["createdAt"]): string {
  if (!ts) return "";
  const date = ts.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface NotificationRowProps {
  item: NotificationDoc;
  onPress: () => void;
}

function NotificationRow({ item, onPress }: NotificationRowProps) {
  const icon = TYPE_ICONS[item.type] ?? { name: "notifications-outline" as const, color: colors.primary };

  return (
    <TouchableOpacity
      style={[styles.row, !item.read && styles.rowUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: icon.color + "18" }]}>
        <Ionicons name={icon.name} size={22} color={icon.color} />
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.rowTime}>{formatTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.rowBody} numberOfLines={2}>{item.body}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { notifications, loading, markRead } = useNotificationList(authUser?.uid);

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  async function handlePress(item: NotificationDoc) {
    if (!item.read) {
      await markRead(item.id);
    }
    if (item.route) {
      router.push(item.route as any);
    }
  }

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

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={48} color={colors.border} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySub}>
              You'll get notified about session reminders, new tutorials, and community activity.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {unread.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>New</Text>
              {unread.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onPress={() => handlePress(item)}
                />
              ))}
            </>
          )}
          {read.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Earlier</Text>
              {read.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onPress={() => handlePress(item)}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 40 },
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowUnread: {
    borderColor: colors.accent + "60",
    backgroundColor: "#FFFDF5",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  rowTitle: { fontSize: 14, fontWeight: "700", color: colors.primary, flex: 1, marginRight: 8 },
  rowTime: { fontSize: 12, color: colors.textSecondary, flexShrink: 0 },
  rowBody: { fontSize: 13, color: colors.textBody, lineHeight: 18 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginLeft: 8,
    marginTop: 4,
    flexShrink: 0,
  },
});
