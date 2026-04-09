import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { confirmCode } from "../../src/lib/auth";
import { pendingConfirmation } from "./login";

export default function VerifyScreen() {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleVerify() {
    if (code.length !== 6) {
      Alert.alert("Invalid code", "Enter the 6-digit code from your text.");
      return;
    }
    if (!pendingConfirmation) {
      Alert.alert("Session expired", "Please request a new code.");
      router.replace("/(auth)/login" as any);
      return;
    }
    setSubmitting(true);
    try {
      await confirmCode(pendingConfirmation, code);
      // The auth gate in root layout will route the user from here.
    } catch (err: any) {
      Alert.alert("Verification failed", err?.message ?? "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter the code</Text>
      <Text style={styles.subtitle}>We sent a 6-digit code to your phone.</Text>
      <TextInput
        style={styles.input}
        placeholder="123456"
        keyboardType="number-pad"
        value={code}
        onChangeText={setCode}
        maxLength={6}
      />
      <TouchableOpacity
        style={[styles.button, submitting && { opacity: 0.5 }]}
        onPress={handleVerify}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>{submitting ? "Verifying..." : "Verify"}</Text>
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
    height: 56,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 8,
    marginVertical: 16
  },
  button: { backgroundColor: "#FACC15", borderRadius: 32, paddingVertical: 16, alignItems: "center" },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#3B0764" }
});
