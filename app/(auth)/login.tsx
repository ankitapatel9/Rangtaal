import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { signInWithPhone, ConfirmationResult } from "../../src/lib/auth";

export let pendingConfirmation: ConfirmationResult | null = null;

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSendOTP() {
    if (phone.length < 10) {
      Alert.alert("Invalid phone", "Enter a 10-digit US phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const e164 = `+1${phone.replace(/\D/g, "")}`;
      const confirmation: ConfirmationResult = await signInWithPhone(e164);
      pendingConfirmation = confirmation;
      router.push("/(auth)/verify" as any);
    } catch (err: any) {
      Alert.alert("Sign-in failed", err?.message ?? "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rangtaal</Text>
      <Text style={styles.tagline}>
        Step into the circle. Join the most vibrant Garba community.
      </Text>
      <View style={styles.inputRow}>
        <Text style={styles.countryCode}>+1</Text>
        <TextInput
          style={styles.input}
          placeholder="(555) 555-5555"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          maxLength={14}
        />
      </View>
      <TouchableOpacity
        style={[styles.button, submitting && { opacity: 0.5 }]}
        onPress={handleSendOTP}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>{submitting ? "Sending..." : "Send OTP →"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#FEE7F1" },
  title: { fontSize: 36, fontWeight: "700", color: "#3B0764", textAlign: "center" },
  tagline: { fontSize: 14, color: "#3B0764", textAlign: "center", marginVertical: 16 },
  inputRow: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    marginVertical: 12
  },
  countryCode: { fontSize: 16, marginRight: 8, color: "#3B0764" },
  input: { flex: 1, height: 48, fontSize: 16 },
  button: {
    backgroundColor: "#FACC15",
    borderRadius: 32,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12
  },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#3B0764" }
});
