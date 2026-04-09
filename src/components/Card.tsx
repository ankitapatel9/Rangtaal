import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { colors } from "../theme/colors";
import { spacing, shadows } from "../theme/spacing";

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  goldBorder?: boolean; // gold left border for active/selected/confirmed states
  elevated?: boolean;   // stronger shadow for hero cards
  noPadding?: boolean;
}

export function Card({
  children,
  style,
  goldBorder = false,
  elevated = false,
  noPadding = false,
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated ? shadows.cardElevated : shadows.card,
        goldBorder && styles.goldBorder,
        noPadding && styles.noPadding,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: spacing.cardRadius,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  goldBorder: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  noPadding: {
    padding: 0,
  },
});
