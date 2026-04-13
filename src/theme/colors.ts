// Rangtaal Brand Palette — Plum & Gold (Vibrant)

export const colors = {
  // Brand — more vibrant
  primary: "#1E0A2E",         // Deeper Plum — richer, more contrast
  accent: "#D4A23C",          // Brighter Gold — more pop on CTAs

  // Backgrounds
  pageBackground: "#FAFAF7",  // Slightly cooler ivory — crisper feel
  card: "#FFFFFF",            // White — floating cards

  // Text
  textBody: "#4A3B5E",        // Richer Plum body text
  textSecondary: "#8B8FA3",   // Slightly warmer gray

  // UI
  border: "#E5E0D8",          // Warm Gray — subtle but defined
  destructive: "#E53935",     // Brighter red — more noticeable

  // Semantic
  paymentBannerBg: "#FFF6E0",
  cancelledBg: "#FFEBEE",

  // Hero gradient stops — richer gradient
  heroGradientStart: "#1E0A2E",
  heroGradientEnd: "#2D1B3D",

  // Avatar backgrounds
  avatarPlum: "#1E0A2E",
  avatarGold: "#D4A23C",

  // Aliases
  secondary: "#8B8FA3",
  body: "#4A3B5E",
} as const;

export type ColorKey = keyof typeof colors;
