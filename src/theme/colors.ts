// Rangtaal Brand Palette — Plum & Gold
// Two brand colors only. Maximum restraint.

export const colors = {
  // Brand
  primary: "#2D1B3D",      // Deep Plum — headers, headings, hero backgrounds
  accent: "#C9963C",       // Saffron Gold — CTAs, buttons, links, highlights

  // Backgrounds
  pageBackground: "#FAF7F2", // Warm Ivory — all screen backgrounds
  card: "#FFFFFF",           // White — floating cards

  // Text
  textBody: "#5A4B6B",       // Muted Plum — secondary text, descriptions
  textSecondary: "#9CA3AF",  // Gray — timestamps, meta, placeholders

  // UI
  border: "#E8E2D9",         // Warm Gray — card borders, dividers, inactive toggle
  destructive: "#DC2626",    // Red — cancel, delete, errors ONLY

  // Semantic
  paymentBannerBg: "#FFF8EB",   // Warm yellow for payment due banner
  cancelledBg: "#FEE2E2",       // Light red for cancelled session banner

  // Hero gradient stops
  heroGradientStart: "#2D1B3D",
  heroGradientEnd: "#3D2B4D",

  // Avatar backgrounds (alternating)
  avatarPlum: "#2D1B3D",
  avatarGold: "#C9963C",
} as const;

export type ColorKey = keyof typeof colors;
