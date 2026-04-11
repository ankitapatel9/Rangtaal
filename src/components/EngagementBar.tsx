import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LikeButton } from "./LikeButton";
import { LikeDoc } from "../types/like";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";

export interface EngagementBarProps {
  parentId: string;
  parentType: LikeDoc["parentType"];
  userId: string;
  commentCount: number;
  onCommentPress?: () => void;
  variant?: "light" | "dark";
}

export function EngagementBar({
  parentId,
  parentType,
  userId,
  commentCount,
  onCommentPress,
  variant = "light"
}: EngagementBarProps) {
  const isDark = variant === "dark";
  const iconColor = isDark ? colors.secondary : colors.body;

  return (
    <View style={styles.container}>
      <LikeButton
        parentId={parentId}
        parentType={parentType}
        userId={userId}
        variant={variant}
      />
      <TouchableOpacity
        onPress={onCommentPress}
        style={styles.commentButton}
        accessibilityLabel="Comments"
        accessibilityRole="button"
      >
        <Ionicons name="chatbubble-outline" size={20} color={iconColor} />
        {commentCount > 0 && (
          <Text style={[styles.count, { color: iconColor }]}>
            {commentCount}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg
  },
  commentButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  count: {
    ...typography.bodySmall
  }
});
