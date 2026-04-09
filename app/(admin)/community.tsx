import {
  Text,
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from "react-native";
import { useAllUsers } from "../../src/hooks/useAllUsers";
import { toggleUserPaid } from "../../src/lib/users";
import { UserDoc } from "../../src/types/user";

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
        <ActivityIndicator size="large" color="#3B0764" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Community</Text>
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
  container: { flex: 1, backgroundColor: "#FEE7F1", paddingTop: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FEE7F1" },
  title: { fontSize: 28, fontWeight: "700", color: "#3B0764", paddingHorizontal: 16, marginBottom: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { color: "#3B0764", textAlign: "center", marginTop: 32 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: "flex-end", gap: 6 },
  name: { fontSize: 16, fontWeight: "600", color: "#3B0764" },
  phone: { fontSize: 13, color: "#7C3AED", marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  adminBadge: { backgroundColor: "#FACC15" },
  participantBadge: { backgroundColor: "#E9D5FF" },
  paidBadge: { backgroundColor: "#DCFCE7" },
  unpaidBadge: { backgroundColor: "#F3F4F6" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#3B0764" },
  paidText: { color: "#166534" },
  unpaidText: { color: "#6B7280" }
});
