import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LikeButton } from "./LikeButton";
import { LikeDoc } from "../types/like";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export interface EngagementBarProps {
  parentId: string;
  parentType: LikeDoc["parentType"];
  userId: string;
  commentCount: number;
  onCommentPress?: () => void;
  onSharePress?: () => void;
  variant?: "light" | "dark";
}

export function EngagementBar({
  parentId,
  parentType,
  userId,
  commentCount,
  onCommentPress,
  onSharePress,
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
        style={styles.iconButton}
        activeOpacity={0.7}
        accessibilityLabel="Comments"
        accessibilityRole="button"
      >
        <Ionicons name="chatbubble-outline" size={22} color={iconColor} />
        {commentCount > 0 && (
          <Text style={[styles.count, { color: iconColor }]}>
            {commentCount}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onSharePress}
        style={styles.iconButton}
        activeOpacity={0.7}
        accessibilityLabel="Share"
        accessibilityRole="button"
      >
        <Ionicons name="share-outline" size={22} color={iconColor} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  count: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    lineHeight: 18,
  },
});
