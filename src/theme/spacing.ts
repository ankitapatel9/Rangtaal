// Rangtaal Spacing Scale

export const spacing = {
  // Core units
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,

  // Semantic
  pagePadding: 20,        // Horizontal page padding
  cardPadding: 16,        // Internal card padding
  cardPaddingLg: 18,      // Internal card padding (larger cards)
  cardGap: 8,             // Vertical gap between cards
  cardGapLg: 10,          // Vertical gap (larger spacing)
  sectionSpacing: 20,     // Between sections

  // Border radius
  cardRadius: 14,
  cardRadiusLg: 16,
  buttonRadius: 12,
  avatarRadius: 999,      // Full circle
  pillRadius: 999,        // Full pill
  tagRadius: 6,
} as const;

export const shadows = {
  card: {
    shadowColor: "#2D1B3D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardElevated: {
    shadowColor: "#2D1B3D",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 8,
  },
} as const;
