import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";

export interface SectionHeaderProps {
  title: string;
  rightLabel?: string;
  rightLabelVariant?: "gray" | "gold";
  onRightPress?: () => void;
  style?: ViewStyle;
}

export function SectionHeader({
  title,
  rightLabel,
  rightLabelVariant = "gray",
  onRightPress,
  style,
}: SectionHeaderProps) {
  const rightColor =
    rightLabelVariant === "gold" ? colors.accent : colors.textSecondary;

  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title}>{title}</Text>
      {rightLabel != null && (
        <TouchableOpacity
          onPress={onRightPress}
          disabled={onRightPress == null}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.right, { color: rightColor }]}>{rightLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.sectionTitle,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    letterSpacing: typography.letterSpacing.label,
  },
  right: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.semiBold,
  },
});
