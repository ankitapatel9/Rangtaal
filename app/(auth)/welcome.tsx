import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import auth from "@react-native-firebase/auth";
import { createUserDoc } from "../../src/lib/users";

export default function WelcomeScreen() {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleFinish() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert("Name required", "Please enter your name to continue.");
      return;
    }
    const current = auth().currentUser;
    if (!current) {
      Alert.alert("Not signed in", "Please sign in again.");
      return;
    }
    setSubmitting(true);
    try {
      await createUserDoc({
        uid: current.uid,
        name: trimmed,
        phoneNumber: current.phoneNumber ?? ""
      });
      // The auth gate routes to participant home automatically.
    } catch (err: any) {
      Alert.alert("Could not save", err?.message ?? "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Rangtaal!</Text>
      <Text style={styles.subtitle}>
        Let's get you started. How should your community address you?
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        value={name}
        onChangeText={setName}
      />
      <TouchableOpacity
        style={[styles.button, submitting && { opacity: 0.5 }]}
        onPress={handleFinish}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>
          {submitting ? "Saving..." : "Finish Onboarding →"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#FEE7F1" },
  title: { fontSize: 28, fontWeight: "700", color: "#3B0764", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#3B0764", textAlign: "center", marginVertical: 12 },
  input: {
    backgroundColor: "white",
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    marginVertical: 16,
    fontSize: 16
  },
  button: {
    backgroundColor: "#FACC15",
    borderRadius: 32,
    paddingVertical: 16,
    alignItems: "center"
  },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#3B0764" }
});
