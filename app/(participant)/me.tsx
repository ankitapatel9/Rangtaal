import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { signOut } from "../../src/lib/auth";

export default function ParticipantMe() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Me</Text>
      <Text style={styles.s}>Phase 1 placeholder.</Text>
      <TouchableOpacity style={styles.btn} onPress={() => signOut()}>
        <Text style={styles.btnText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#FEE7F1" },
  t: { fontSize: 28, fontWeight: "700", color: "#3B0764" },
  s: { fontSize: 14, color: "#3B0764", marginTop: 8, textAlign: "center" },
  btn: { marginTop: 24, backgroundColor: "#FACC15", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 32 },
  btnText: { color: "#3B0764", fontWeight: "700" }
});
