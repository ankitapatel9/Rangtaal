import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  Platform,
} from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";

// Conditional haptics import — native only
let haptics: { impactAsync: (style?: string) => Promise<void> } | null = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    haptics = require("expo-haptics");
  } catch {
    // expo-haptics not available in test environment — ignore
  }
}

export type GoldButtonVariant = "gold" | "plum" | "outline" | "destructive";

export interface GoldButtonProps {
  label: string;
  onPress: () => void;
  variant?: GoldButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GoldButton({
  label,
  onPress,
  variant = "gold",
  loading = false,
  disabled = false,
  style,
}: GoldButtonProps) {
  async function handlePress() {
    if (disabled || loading) return;
    try {
      if (haptics) {
        await (haptics as typeof import("expo-haptics")).impactAsync(
          (await import("expo-haptics")).ImpactFeedbackStyle.Medium
        );
      }
    } catch {
      // haptics unavailable — continue silently
    }
    onPress();
  }

  const bg =
    variant === "plum"
      ? colors.primary
      : variant === "destructive"
      ? colors.destructive
      : variant === "outline"
      ? "transparent"
      : colors.accent;

  const textCol =
    variant === "outline" ? colors.accent : colors.card;

  const borderStyle =
    variant === "outline"
      ? { borderWidth: 1.5, borderColor: colors.accent }
      : undefined;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        { backgroundColor: bg },
        borderStyle,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textCol} size="small" />
      ) : (
        <Text style={[styles.label, { color: textCol }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: spacing.buttonRadius,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  label: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.5,
  },
});
