import {
  Text,
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { useAllUsers } from "../../src/hooks/useAllUsers";
import { toggleUserPaid } from "../../src/lib/users";
import { UserDoc } from "../../src/types/user";
import { colors } from "../../src/theme/colors";
import { INVITE_MESSAGE } from "../../src/lib/constants";

async function handleInvite() {
  try {
    await Share.share({ message: INVITE_MESSAGE });
  } catch {
    Alert.alert("Error", "Could not open share sheet. Please try again.");
  }
}

function UserRow({ item }: { item: UserDoc }) {
  const handlePress = () => {
    Alert.alert(
      "Toggle payment?",
      `Set ${item.name} to ${item.paid ? "Unpaid" : "Paid"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => toggleUserPaid(item.uid, !item.paid)
        }
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.cardLeft}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.phone}>{item.phoneNumber}</Text>
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.badge, item.role === "admin" ? styles.adminBadge : styles.participantBadge]}>
          <Text style={styles.badgeText}>{item.role}</Text>
        </View>
        <View style={[styles.badge, item.paid ? styles.paidBadge : styles.unpaidBadge]}>
          <Text style={[styles.badgeText, item.paid ? styles.paidText : styles.unpaidText]}>
            {item.paid ? "Paid ✓" : "Unpaid"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function AdminCommunity() {
  const { users, loading } = useAllUsers();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Community</Text>
        <TouchableOpacity style={styles.inviteBtn} onPress={handleInvite}>
          <Text style={styles.inviteBtnText}>+ Invite</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={users}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => <UserRow item={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No members yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBackground, paddingTop: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.pageBackground },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: { fontSize: 28, fontWeight: "700", color: colors.primary },
  inviteBtn: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  inviteBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { color: colors.primary, textAlign: "center", marginTop: 32 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: "flex-end", gap: 6 },
  name: { fontSize: 16, fontWeight: "600", color: colors.primary },
  phone: { fontSize: 13, color: colors.textBody, marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  adminBadge: { backgroundColor: colors.accent },
  participantBadge: { backgroundColor: colors.border },
  paidBadge: { backgroundColor: "#FFF8EB" },
  unpaidBadge: { backgroundColor: "#F5F0EA" },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.primary },
  paidText: { color: colors.accent },
  unpaidText: { color: colors.textBody }
});
