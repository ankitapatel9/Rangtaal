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

const INVITE_MESSAGE =
  "Join our Garba community on Rangtaal! 🪘\n\nDownload the app: https://rangtaal.app";

function SettingsRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={colors.primary} style={styles.menuIcon} />
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
          <Avatar name={userName} size={72} />
          <Text style={styles.name}>{userName}</Text>
          <Text style={styles.phone}>{userDoc?.phoneNumber ?? ""}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
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

        {/* Payment */}
        <View style={[styles.paymentCard, userDoc?.paid && styles.paymentCardPaid]}>
          <View>
            <Text style={styles.paymentTitle}>Payment</Text>
            <Text style={styles.paymentSub}>
              {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </Text>
          </View>
          <Text style={[styles.paymentStatus, userDoc?.paid ? styles.paidText : styles.unpaidText]}>
            {userDoc?.paid ? "Paid ✓" : "Unpaid"}
          </Text>
        </View>

        {/* Settings */}
        <View style={styles.menuCard}>
          <SettingsRow
            icon="notifications-outline"
            label="Notifications"
            onPress={() => router.push("/notifications" as any)}
          />
          <View style={styles.menuDivider} />
          <SettingsRow
            icon="images-outline"
            label="My Uploads"
            onPress={() => router.push("/(participant)/gallery" as any)}
          />
          <View style={styles.menuDivider} />
          <SettingsRow
            icon="help-circle-outline"
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
          <SettingsRow icon="share-social-outline" label="Invite Friends" onPress={handleInvite} />
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
  profileHeader: { alignItems: "center", marginBottom: 24 },
  name: { fontSize: 24, fontWeight: "800", color: colors.primary, marginTop: 12 },
  phone: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    flexDirection: "row",
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 28, fontWeight: "800", color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },
  paymentCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
    shadowColor: colors.primary,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  paymentCardPaid: { borderLeftColor: colors.accent },
  paymentTitle: { fontSize: 15, fontWeight: "600", color: colors.primary },
  paymentSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  paymentStatus: { fontSize: 14, fontWeight: "700" },
  paidText: { color: colors.accent },
  unpaidText: { color: colors.textSecondary },
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
  menuRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  menuIcon: { marginRight: 12 },
  menuText: { flex: 1, fontSize: 15, color: colors.primary, fontWeight: "500" },
  menuDivider: { height: 1, backgroundColor: colors.border, marginLeft: 48 },
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
