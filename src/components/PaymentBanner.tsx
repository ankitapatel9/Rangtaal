import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";

export interface PaymentBannerProps {
  dueDate?: string;   // e.g. "May 1" — if omitted, generic message shown
  amount?: string;    // e.g. "$60"
  style?: StyleProp<ViewStyle>;
  onDismiss?: () => void;
}

export function PaymentBanner({
  dueDate,
  amount = "$60",
  style,
  onDismiss,
}: PaymentBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  const dueLine = dueDate ? `Payment due ${dueDate}` : "Payment due";

  return (
    <View style={[styles.banner, style]}>
      <View style={styles.content}>
        <Text style={styles.title}>{dueLine}</Text>
        <Text style={styles.sub}>{amount} · Contact admin</Text>
      </View>
      <TouchableOpacity
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.dismiss}
      >
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.paymentBannerBg,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: spacing.cardRadius,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.base,
    marginHorizontal: spacing.pagePadding,
    marginBottom: spacing.sm,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
  },
  sub: {
    fontSize: typography.fontSize.caption,
    color: colors.textBody,
    marginTop: 2,
  },
  dismiss: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  dismissText: {
    fontSize: typography.fontSize.body,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
});
