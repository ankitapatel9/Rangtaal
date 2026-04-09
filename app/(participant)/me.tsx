import { Text, View, StyleSheet, TouchableOpacity, Share, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "../../src/lib/auth";
import { useAuth } from "../../src/hooks/useAuth";
import { useUser } from "../../src/hooks/useUser";
import { colors } from "../../src/theme/colors";

const INVITE_MESSAGE =
  "Join our Garba community on Rangtaal! 🪘\n\nDownload the app: https://rangtaal.app";

async function handleInvite() {
  try {
    await Share.share({ message: INVITE_MESSAGE });
  } catch {
    Alert.alert("Error", "Could not open share sheet. Please try again.");
  }
}

export default function ParticipantMe() {
  const { user: authUser } = useAuth();
  const { user: userDoc } = useUser(authUser?.uid);

  return (
    <View style={styles.c}>
      <Text style={styles.t}>Me</Text>

      {userDoc && (
        <View style={styles.infoCard}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{userDoc.name}</Text>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{userDoc.phoneNumber}</Text>
        </View>
      )}

      <View style={[styles.badge, userDoc?.paid ? styles.paidBadge : styles.unpaidBadge]}>
        <Text style={[styles.badgeText, userDoc?.paid ? styles.paidText : styles.unpaidText]}>
          {userDoc?.paid ? "Paid ✓" : "Unpaid"}
        </Text>
      </View>

      {/* Settings menu */}
      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuRow} onPress={handleInvite}>
          <Ionicons name="share-social-outline" size={20} color={colors.primary} style={styles.menuIcon} />
          <Text style={styles.menuText}>Invite Friends</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.btn} onPress={() => signOut()}>
        <Text style={styles.btnText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.pageBackground },
  t: { fontSize: 28, fontWeight: "700", color: colors.primary, marginBottom: 20 },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 16
  },
  label: { fontSize: 11, fontWeight: "700", color: colors.primary, textTransform: "uppercase", marginTop: 8 },
  value: { fontSize: 16, color: colors.primary, marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 24 },
  paidBadge: { backgroundColor: "#FFF8EB" },
  unpaidBadge: { backgroundColor: "#F5F0EA" },
  badgeText: { fontSize: 14, fontWeight: "700" },
  paidText: { color: colors.accent },
  unpaidText: { color: colors.textBody },
  menuCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    width: "100%",
    marginBottom: 16,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: colors.primary,
    fontWeight: "500",
  },
  btn: { backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 32 },
  btnText: { color: colors.primary, fontWeight: "700" }
});
