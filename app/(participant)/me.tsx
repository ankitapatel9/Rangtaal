import { Text, View, StyleSheet, TouchableOpacity, Share, Alert, ScrollView, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "../../src/lib/auth";
import { useAuth } from "../../src/hooks/useAuth";
import { useUser } from "../../src/hooks/useUser";
import { useActiveClass } from "../../src/hooks/useActiveClass";
import { useSessions } from "../../src/hooks/useSessions";
import { Avatar } from "../../src/components";
import { colors } from "../../src/theme/colors";
import { INVITE_MESSAGE } from "../../src/lib/constants";

function SettingsRow({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.menuText}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

export default function ParticipantMe() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { user: userDoc } = useUser(authUser?.uid);
  const { class_ } = useActiveClass();
  const { sessions } = useSessions(class_?.id);

  const userName = userDoc?.name ?? "User";
  const uid = authUser?.uid ?? "";

  const now = Date.now();
  const attended = sessions.filter(
    (s) => s.rsvps.includes(uid) && new Date(s.date).getTime() < now
  ).length;
  const rsvpd = sessions.filter((s) => s.rsvps.includes(uid)).length;

  async function handleInvite() {
    try {
      await Share.share({ message: INVITE_MESSAGE });
    } catch {
      Alert.alert("Error", "Could not open share sheet.");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <Avatar name={userName} size={64} />
          <View>
            <Text style={styles.name}>{userName}</Text>
            <Text style={styles.phone}>{userDoc?.phoneNumber ?? ""}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsSeasonLabel}>THIS SEASON</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{attended}</Text>
              <Text style={styles.statLabel}>Attended</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{rsvpd}</Text>
              <Text style={styles.statLabel}>RSVP'd</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Uploaded</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.menuCard}>
          <SettingsRow
            label="Notifications"
            onPress={() => router.push("/notifications" as any)}
          />
          <View style={styles.menuDivider} />
          <SettingsRow
            label="Help & Support"
            onPress={() =>
              Alert.alert(
                "Help & Support",
                "For questions or issues, contact your class admin or email support@rangtaal.app"
              )
            }
          />
        </View>

        {/* Invite */}
        <View style={styles.menuCard}>
          <SettingsRow label="Invite Friends" onPress={handleInvite} />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutCard} onPress={() => signOut()} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBackground },
  content: { padding: 20, paddingBottom: 40 },

  // Horizontal profile header
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  name: { fontSize: 22, fontWeight: "800", color: colors.primary },
  phone: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },

  // Stats card
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  statsSeasonLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  statsRow: { flexDirection: "row" },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 28, fontWeight: "800", color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },

  // Menu card
  menuCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  menuRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16 },
  menuText: { flex: 1, fontSize: 15, color: colors.primary },
  menuDivider: { height: 1, backgroundColor: "#F5F0EA" },

  // Sign out
  signOutCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  signOutText: { fontSize: 15, color: colors.destructive, fontWeight: "500" },
});
