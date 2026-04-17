// Rangtaal Brand Palette — ALL FOUR logo colors used throughout
// Plum, Saffron Gold, Orange, Green — each has a UI role

export const colors = {
  // Brand colors — matched to logo exactly
  primary: "#2D1B3D",         // Deep Plum — hero bg, headers, text
  accent: "#C9963C",          // Saffron Gold — CTAs, buttons, camera
  orange: "#C85A2A",          // Warm Orange — likes, bell badge, highlights
  green: "#2D6B4F",           // Forest Green — paid, success, confirmed

  // Backgrounds
  pageBackground: "#FAF7F2",  // Warm Ivory (logo outer ring)
  card: "#FFFFFF",

  // Text
  textBody: "#5A4B6B",
  textSecondary: "#9CA3AF",

  // UI
  border: "#E8E2D9",
  destructive: "#D94032",

  // Semantic backgrounds
  paymentBannerBg: "#FFF3D0",
  announcementBg: "#FFF6E0",   // Warm cream — announcement card
  cancelledBg: "#FFEBEE",
  successBg: "#E8F5EE",
  orangeBg: "#FFF0E8",

  // Subtle divider (menu item separators)
  subtleDivider: "#F5F0EA",

  // Hero gradient
  heroGradientStart: "#2D1B3D",
  heroGradientEnd: "#4A3060",

  // Avatars — rotate all 4 brand colors
  avatarPlum: "#2D1B3D",
  avatarGold: "#C9963C",
  avatarOrange: "#C85A2A",
  avatarGreen: "#2D6B4F",

  // Aliases
  secondary: "#9CA3AF",
  body: "#5A4B6B",
} as const;

export type ColorKey = keyof typeof colors;
