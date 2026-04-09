import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export type AvatarVariant = "plum" | "gold";

export interface AvatarProps {
  name: string;
  size?: number;
  variant?: AvatarVariant;
  index?: number; // used to alternate colors automatically
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getBackgroundColor(variant: AvatarVariant): string {
  return variant === "gold" ? colors.accent : colors.primary;
}

export function Avatar({ name, size = 36, variant, index = 0 }: AvatarProps) {
  const resolvedVariant: AvatarVariant =
    variant ?? (index % 2 === 0 ? "plum" : "gold");
  const bg = getBackgroundColor(resolvedVariant);
  const fontSize = Math.floor(size * 0.38);

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.card,
  },
  initials: {
    color: colors.card,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
});
