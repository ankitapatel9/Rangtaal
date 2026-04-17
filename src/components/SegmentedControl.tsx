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
    backgroundColor: "#E8E2D9",
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: "center",
  },
  activeSegment: {
    backgroundColor: colors.card,
    ...shadows.card,
  },
  label: {
    fontSize: 13,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semiBold,
  },
});
