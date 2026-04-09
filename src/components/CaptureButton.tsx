import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Camera } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors } from "../theme/colors";

interface CaptureButtonProps {
  onPress: () => void;
}

export function CaptureButton({ onPress }: CaptureButtonProps) {
  async function handlePress() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <Camera size={24} color={colors.card} strokeWidth={2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
});
