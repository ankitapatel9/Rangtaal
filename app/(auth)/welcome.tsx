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
} from "react-native";
import auth from "@react-native-firebase/auth";
import { createUserDoc } from "../../src/lib/users";
import { GoldButton } from "../../src/components/GoldButton";
import { colors } from "../../src/theme/colors";
import { typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";

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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Welcome to Rangtaal 🪘</Text>
            <Text style={styles.subtitle}>Let's get you set up.</Text>
          </View>

          {/* Name input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Your name</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Enter your name"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleFinish}
              editable={!submitting}
            />
          </View>

          {/* CTA */}
          <GoldButton
            label={submitting ? "Saving…" : "Join Rangtaal"}
            onPress={handleFinish}
            loading={submitting}
          />
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
    justifyContent: "center",
    gap: spacing.xl,
  },
  headerSection: {
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.primary,
    textAlign: "center",
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
  },
  inputSection: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
  },
  nameInput: {
    backgroundColor: colors.card,
    borderRadius: spacing.cardRadius,
    borderWidth: 1,
    borderColor: colors.border,
    height: 52,
    paddingHorizontal: spacing.base,
    fontSize: 16,
    color: colors.primary,
  },
});
