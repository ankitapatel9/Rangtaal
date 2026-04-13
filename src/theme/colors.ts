// Rangtaal Brand Palette — from the logo
// Four vibrant brand colors: Plum, Gold, Orange, Green

export const colors = {
  // Brand colors — all from the Rangtaal logo
  primary: "#342145",         // Deep Plum — headers, hero backgrounds
  accent: "#D4A843",          // Saffron Gold — primary CTAs, buttons
  orange: "#C85A2A",          // Warm Orange — highlights, badges, dots
  green: "#2D6B4F",           // Forest Green — success, confirmed, paid

  // Backgrounds
  pageBackground: "#FAF7F2",  // Warm Ivory from logo outer ring
  card: "#FFFFFF",            // White — floating cards

  // Text
  textBody: "#4A3860",        // Muted Plum
  textSecondary: "#8B8FA3",   // Gray

  // UI
  border: "#E5DFD6",          // Warm Gray
  destructive: "#D94032",     // Red — cancel, delete

  // Semantic — using brand colors
  paymentBannerBg: "#FFF3D0", // Light gold
  cancelledBg: "#FFEBEE",     // Light red
  successBg: "#E8F5EE",       // Light green
  orangeBg: "#FFF0E8",        // Light orange

  // Hero gradient
  heroGradientStart: "#342145",
  heroGradientEnd: "#4A3060",

  // Avatar backgrounds — rotate through brand colors
  avatarPlum: "#342145",
  avatarGold: "#D4A843",
  avatarOrange: "#C85A2A",
  avatarGreen: "#2D6B4F",

  // Aliases
  secondary: "#8B8FA3",
  body: "#4A3860",
} as const;

export type ColorKey = keyof typeof colors;
