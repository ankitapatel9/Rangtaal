import React, { useRef } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLikes } from "../hooks/useLikes";
import { LikeDoc } from "../types/like";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

let Haptics: typeof import("expo-haptics") | null = null;
try { Haptics = require("expo-haptics"); } catch {}

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
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isDark = variant === "dark";
  const inactiveColor = isDark ? colors.secondary : colors.body;

  async function handlePress() {
    // Spring-bounce animation on tap
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.25,
        useNativeDriver: true,
        speed: 50,
        bounciness: 10,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 6,
      }),
    ]).start();

    try {
      if (Haptics) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
    await toggle();
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      activeOpacity={0.7}
      accessibilityLabel={isLiked ? "Unlike" : "Like"}
      accessibilityRole="button"
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons
          name={isLiked ? "heart" : "heart-outline"}
          size={22}
          color={isLiked ? colors.accent : inactiveColor}
        />
      </Animated.View>
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
    gap: 6,
  },
  count: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    lineHeight: 18,
  },
});
