import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { signOut } from "../../src/lib/auth";
import { useAuth } from "../../src/hooks/useAuth";
import { useUser } from "../../src/hooks/useUser";
import { colors } from "../../src/theme/colors";

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
  btn: { backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 32 },
  btnText: { color: colors.primary, fontWeight: "700" }
});
