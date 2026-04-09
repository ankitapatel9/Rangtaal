import { Text, View, StyleSheet } from "react-native";
import { colors } from "../../src/theme/colors";

export default function AdminFinance() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Finance</Text>
      <Text style={styles.s}>Phase 1 placeholder. Profit & Loss arrives in Phase 7.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.pageBackground },
  t: { fontSize: 28, fontWeight: "700", color: colors.primary },
  s: { fontSize: 14, color: colors.primary, marginTop: 8, textAlign: "center" }
});
