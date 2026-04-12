import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { signInWithPhone, ConfirmationResult } from "../../src/lib/auth";
import { GoldButton } from "../../src/components/GoldButton";
import { colors } from "../../src/theme/colors";
import { typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";

export let pendingConfirmation: ConfirmationResult | null = null;
export let pendingPhone: string = "";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  function handlePhoneChange(text: string) {
    const formatted = formatPhone(text);
    setPhone(formatted);
  }

  async function handleSendOTP() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      Alert.alert("Invalid phone", "Enter a 10-digit US phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const e164 = `+1${digits}`;
      const confirmation: ConfirmationResult = await signInWithPhone(e164);
      pendingConfirmation = confirmation;
      pendingPhone = phone;
      router.push("/(auth)/verify" as any);
    } catch (err: any) {
      Alert.alert("Sign-in failed", err?.message ?? "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          {/* Hero section */}
          <View style={styles.heroSection}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.logoImage}
            />
            <Text style={styles.wordmark}>Rangtaal</Text>
            <Text style={styles.tagline}>Step into the circle</Text>
          </View>

          {/* Input section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Phone number</Text>
            <View style={styles.phoneCard}>
              <View style={styles.prefixContainer}>
                <Text style={styles.prefixText}>+1</Text>
              </View>
              <View style={styles.prefixDivider} />
              <TextInput
                style={styles.phoneInput}
                placeholder="(555) 555-5555"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={handlePhoneChange}
                maxLength={14}
                returnKeyType="done"
                onSubmitEditing={handleSendOTP}
              />
            </View>

            <GoldButton
              label={submitting ? "Sending…" : "Continue"}
              onPress={handleSendOTP}
              loading={submitting}
              style={styles.continueButton}
            />

            <Text style={styles.legalText}>
              By continuing, you agree to receive a verification code via SMS
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.pageBackground,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.pagePadding,
    justifyContent: "space-between",
    paddingBottom: spacing.xxl,
  },
  // Hero
  heroSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xxxl,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: spacing.base,
  },
  wordmark: {
    fontSize: 32,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.primary,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 15,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
  },
  // Input section
  inputSection: {
    gap: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  phoneCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: spacing.cardRadius,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    height: 52,
    overflow: "hidden",
  },
  prefixContainer: {
    paddingHorizontal: spacing.base,
    justifyContent: "center",
    alignItems: "center",
  },
  prefixText: {
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
  },
  prefixDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  phoneInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: spacing.base,
    fontSize: 16,
    color: colors.primary,
  },
  continueButton: {
    marginTop: spacing.xs,
  },
  legalText: {
    fontSize: typography.fontSize.caption,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
