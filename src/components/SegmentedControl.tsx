import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing, shadows } from "../theme/spacing";

export interface SegmentedControlProps {
  options: [string, string];
  selectedIndex: 0 | 1;
  onChange: (index: 0 | 1) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl({
  options,
  selectedIndex,
  onChange,
  style,
}: SegmentedControlProps) {
  return (
    <View style={[styles.container, style]}>
      {options.map((opt, i) => {
        const active = selectedIndex === i;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(i as 0 | 1)}
            activeOpacity={0.8}
            style={[styles.segment, active && styles.activeSegment]}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.border,
    borderRadius: spacing.pillRadius,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.pillRadius,
    alignItems: "center",
  },
  activeSegment: {
    backgroundColor: colors.card,
    ...shadows.card,
  },
  label: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textSecondary,
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
});
