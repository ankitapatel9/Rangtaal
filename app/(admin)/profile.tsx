import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { signOut } from "../../src/lib/auth";
import { colors } from "../../src/theme/colors";

export default function AdminProfile() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Admin Profile</Text>
      <Text style={styles.s}>Phase 1 placeholder.</Text>
      <TouchableOpacity style={styles.btn} onPress={() => signOut()}>
        <Text style={styles.btnText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.pageBackground },
  t: { fontSize: 28, fontWeight: "700", color: colors.primary },
  s: { fontSize: 14, color: colors.primary, marginTop: 8, textAlign: "center" },
  btn: { marginTop: 24, backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 32 },
  btnText: { color: colors.primary, fontWeight: "700" }
});
