import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { Heart } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useLikes } from "../hooks/useLikes";
import { LikeDoc } from "../types/like";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";

export interface LikeButtonProps {
  parentId: string;
  parentType: LikeDoc["parentType"];
  userId: string;
  variant?: "light" | "dark";
}

export function LikeButton({
  parentId,
  parentType,
  userId,
  variant = "light"
}: LikeButtonProps) {
  const { count, isLiked, toggle } = useLikes(parentId, userId, parentType);

  const isDark = variant === "dark";
  const inactiveColor = isDark ? colors.secondary : colors.body;

  async function handlePress() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggle();
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      accessibilityLabel={isLiked ? "Unlike" : "Like"}
      accessibilityRole="button"
    >
      <Heart
        size={20}
        color={isLiked ? colors.accent : inactiveColor}
        fill={isLiked ? colors.accent : "transparent"}
      />
      {count > 0 && (
        <Text
          style={[
            styles.count,
            { color: isLiked ? colors.accent : inactiveColor }
          ]}
        >
          {count}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  count: {
    ...typography.bodySmall
  }
});
