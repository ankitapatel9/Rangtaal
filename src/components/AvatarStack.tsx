import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Avatar } from "./Avatar";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export interface AvatarStackProps {
  names: string[];
  maxVisible?: number;
  size?: number;
  overlap?: number;
}

export function AvatarStack({
  names,
  maxVisible = 4,
  size = 32,
  overlap = 10,
}: AvatarStackProps) {
  const visible = names.slice(0, maxVisible);
  const overflow = names.length - visible.length;

  return (
    <View style={styles.row}>
      {visible.map((name, i) => (
        <View
          key={i}
          style={[
            styles.avatarWrapper,
            i > 0 && { marginLeft: -overlap },
          ]}
        >
          <Avatar name={name} size={size} index={i} />
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={[
            styles.overflowCircle,
            { width: size, height: size, borderRadius: size / 2, marginLeft: -overlap },
          ]}
        >
          <Text style={[styles.overflowText, { fontSize: Math.floor(size * 0.35) }]}>
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    // z-index layering handled by ordering
  },
  overflowCircle: {
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  overflowText: {
    color: colors.textBody,
    fontWeight: typography.fontWeight.semiBold,
  },
});
