// Rangtaal Brand Palette — ALL FOUR logo colors used throughout
// Plum, Saffron Gold, Orange, Green — each has a UI role

export const colors = {
  // Brand colors — matched to logo exactly
  primary: "#342145",         // Deep Plum — hero bg, headers, text
  accent: "#D4A843",          // Saffron Gold — CTAs, buttons, camera
  orange: "#C85A2A",          // Warm Orange — likes, bell badge, highlights
  green: "#2D6B4F",           // Forest Green — paid, success, confirmed

  // Backgrounds
  pageBackground: "#FAF7F2",  // Warm Ivory (logo outer ring)
  card: "#FFFFFF",

  // Text
  textBody: "#4A3860",
  textSecondary: "#8B8FA3",

  // UI
  border: "#E5DFD6",
  destructive: "#D94032",

  // Semantic backgrounds
  paymentBannerBg: "#FFF3D0",
  cancelledBg: "#FFEBEE",
  successBg: "#E8F5EE",
  orangeBg: "#FFF0E8",

  // Hero gradient
  heroGradientStart: "#342145",
  heroGradientEnd: "#4A3060",

  // Avatars — rotate all 4 brand colors
  avatarPlum: "#342145",
  avatarGold: "#D4A843",
  avatarOrange: "#C85A2A",
  avatarGreen: "#2D6B4F",

  // Aliases
  secondary: "#8B8FA3",
  body: "#4A3860",
} as const;

export type ColorKey = keyof typeof colors;
