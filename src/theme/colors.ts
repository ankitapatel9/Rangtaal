// Rangtaal Brand Palette — Vibrant, from the logo
// Four brand colors: Plum, Gold, Orange, Green

export const colors = {
  // Brand colors — VIBRANT
  primary: "#2A1040",         // Rich Plum
  accent: "#E8B032",          // Bright Gold — pops on buttons
  orange: "#D4622A",          // Vivid Orange — warm energy
  green: "#2E7D55",           // Rich Green — success, confirmed

  // Backgrounds
  pageBackground: "#F9F6F1",  // Warm Ivory
  card: "#FFFFFF",

  // Text
  textBody: "#40305A",        // Plum body
  textSecondary: "#858A9E",   // Balanced gray

  // UI
  border: "#E2DCD2",
  destructive: "#E53935",

  // Semantic
  paymentBannerBg: "#FFF2CC",   // Brighter yellow
  cancelledBg: "#FFEBEE",
  successBg: "#E0F2E9",
  orangeBg: "#FFEDE0",

  // Hero gradient
  heroGradientStart: "#2A1040",
  heroGradientEnd: "#3D2058",

  // Avatars — rotate all 4 vibrant colors
  avatarPlum: "#2A1040",
  avatarGold: "#E8B032",
  avatarOrange: "#D4622A",
  avatarGreen: "#2E7D55",

  // Aliases
  secondary: "#858A9E",
  body: "#40305A",
} as const;

export type ColorKey = keyof typeof colors;
