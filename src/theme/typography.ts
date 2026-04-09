// Rangtaal Typography Scale

export const typography = {
  // Font sizes
  fontSize: {
    heroTitle: 26,   // Wordmark, hero headings
    sectionTitle: 17, // Section headers
    cardTitle: 16,    // Card titles
    body: 14,         // Body text
    caption: 12,      // Timestamps, meta
    label: 11,        // Uppercase labels (NEXT TUESDAY, UPCOMING, etc.)
    labelSmall: 10,   // Small uppercase labels
  },

  // Font weights (as strings for RN)
  fontWeight: {
    extraBold: "800" as const,
    bold: "700" as const,
    semiBold: "600" as const,
    medium: "500" as const,
    regular: "400" as const,
  },

  // Letter spacing
  letterSpacing: {
    label: 1.5,
    labelWide: 2,
    normal: 0,
  },

  // Line heights
  lineHeight: {
    tight: 18,
    normal: 20,
    relaxed: 22,
  },
} as const;
