import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export type AvatarVariant = "plum" | "gold" | "orange" | "green";

const AVATAR_COLORS: string[] = [
  colors.avatarPlum,
  colors.avatarGold,
  colors.avatarOrange,
  colors.avatarGreen,
];

export interface AvatarProps {
  name: string;
  size?: number;
  variant?: AvatarVariant;
  index?: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getBackgroundColor(variant: AvatarVariant | undefined, index: number): string {
  if (variant === "plum") return colors.avatarPlum;
  if (variant === "gold") return colors.avatarGold;
  if (variant === "orange") return colors.avatarOrange;
  if (variant === "green") return colors.avatarGreen;
  // Rotate through all four brand colors
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function Avatar({ name, size = 36, variant, index = 0 }: AvatarProps) {
  // Use name hash for consistent color per person
  const nameHash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const bg = getBackgroundColor(variant, variant ? index : nameHash);
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
