// Rangtaal Brand Palette — Plum & Gold (Vibrant)

export const colors = {
  // Brand — vibrant, high contrast
  primary: "#180728",         // Deep Plum — rich and bold
  accent: "#E0A830",          // Vibrant Gold — eye-catching CTAs

  // Backgrounds
  pageBackground: "#F8F7F4",  // Warm off-white — clean and crisp
  card: "#FFFFFF",            // White — floating cards

  // Text
  textBody: "#3D2B52",        // Rich Plum body text — readable
  textSecondary: "#7E839A",   // Balanced gray

  // UI
  border: "#E2DDD5",          // Warm Gray — defined borders
  destructive: "#E53935",     // Bright red

  // Semantic
  paymentBannerBg: "#FFF3D0",
  cancelledBg: "#FFEBEE",

  // Hero gradient stops — dramatic gradient
  heroGradientStart: "#180728",
  heroGradientEnd: "#2A1540",

  // Avatar backgrounds
  avatarPlum: "#180728",
  avatarGold: "#E0A830",

  // Aliases
  secondary: "#7E839A",
  body: "#3D2B52",
} as const;

export type ColorKey = keyof typeof colors;
