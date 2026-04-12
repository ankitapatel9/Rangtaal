import React, { useState, useRef } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { confirmCode } from "../../src/lib/auth";
import { pendingConfirmation, pendingPhone } from "./login";
import { colors } from "../../src/theme/colors";
import { typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";

const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>(Array(CODE_LENGTH).fill(null));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const router = useRouter();

  const displayPhone = pendingPhone
    ? `+1 ${pendingPhone}`
    : "+1 (555) 555-5555";

  async function handleVerify(code: string) {
    if (code.length !== CODE_LENGTH) {
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

  function handleDigitChange(text: string, index: number) {
    const cleaned = text.replace(/\D/g, "");

    // iOS SMS autofill pastes the full code into the first box
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, CODE_LENGTH).split("");
      const newDigits = [...digits];
      chars.forEach((c, i) => { newDigits[i] = c; });
      setDigits(newDigits);
      // Focus the last filled box or the next empty one
      const nextIndex = Math.min(chars.length, CODE_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      if (newDigits.every((d) => d !== "")) {
        handleVerify(newDigits.join(""));
      }
      return;
    }

    const digit = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== "") && digit) {
      handleVerify(newDigits.join(""));
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === "Backspace" && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = "";
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleResend() {
    router.replace("/(auth)/login" as any);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <ChevronLeft size={20} {...({ stroke: colors.accent, strokeWidth: 2 } as any)} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Enter code</Text>
          <Text style={styles.subtitle}>Sent to {displayPhone}</Text>
        </View>

        {/* 6 digit boxes */}
        <View style={styles.codeRow}>
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.digitBox,
                focusedIndex === index
                  ? styles.digitBoxFocused
                  : styles.digitBoxBlur,
              ]}
              value={digit}
              onChangeText={(text) => handleDigitChange(text, index)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(nativeEvent.key, index)
              }
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              keyboardType="number-pad"
              maxLength={index === 0 ? 6 : 2}
              textAlign="center"
              selectionColor={colors.accent}
              returnKeyType="done"
              editable={!submitting}
              caretHidden={false}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
            />
          ))}
        </View>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't get the code? </Text>
          <TouchableOpacity onPress={handleResend} disabled={submitting}>
            <Text style={styles.resendLink}>Resend</Text>
          </TouchableOpacity>
        </View>

        {/* Footer note */}
        <Text style={styles.footerNote}>
          Code auto-verifies when all 6 digits are entered
        </Text>
      </View>
    </SafeAreaView>
  );
}

const DIGIT_BOX_SIZE = { width: 48, height: 56 };

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.pageBackground,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.pagePadding,
    paddingTop: Platform.OS === "android" ? spacing.base : spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  backText: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.accent,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.pagePadding,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
  },
  headerSection: {
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.primary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: typography.fontSize.body,
    color: colors.textSecondary,
  },
  codeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
  },
  digitBox: {
    ...DIGIT_BOX_SIZE,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 22,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  digitBoxFocused: {
    borderColor: colors.accent,
  },
  digitBoxBlur: {
    borderColor: colors.border,
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  resendLabel: {
    fontSize: typography.fontSize.body,
    color: colors.textSecondary,
  },
  resendLink: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.accent,
  },
  footerNote: {
    fontSize: typography.fontSize.caption,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});
