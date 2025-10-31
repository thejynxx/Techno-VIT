// Updated Theme Configuration using provided palette
// Palette: EAE8FF, D8D5DB, ADACB5, 2D3142, B0D7FF
const PALETTE = {
  lightLavender: '#EAE8FF',
  softGrayLavender: '#D8D5DB',
  mutedGray: '#ADACB5',
  darkSlate: '#2D3142',
  softBlue: '#B0D7FF',
};

const theme = {
  colors: {
    // Core
    primary: PALETTE.darkSlate,
    primaryDark: PALETTE.darkSlate,
    primaryLight: PALETTE.softBlue,

    secondary: PALETTE.softBlue,
    secondaryDark: PALETTE.mutedGray,

    accent: PALETTE.lightLavender,
    accentLight: PALETTE.softGrayLavender,

    // Backgrounds
    background: PALETTE.lightLavender,
    backgroundSecondary: PALETTE.softGrayLavender,
    backgroundCard: PALETTE.softBlue,

    // Text
    text: PALETTE.darkSlate,
    textSecondary: PALETTE.mutedGray,
    textLight: PALETTE.lightLavender,
    textMuted: PALETTE.softGrayLavender,

    // Status mapped to palette
    success: PALETTE.softBlue,
    warning: PALETTE.mutedGray,
    error: PALETTE.darkSlate,
    info: PALETTE.softGrayLavender,

    // Shadow colors (neutrals kept for depth)
    shadow: '#000000',
    shadowLight: 'rgba(0,0,0,0.1)',
    shadowMedium: 'rgba(0,0,0,0.2)',
    shadowDark: 'rgba(0,0,0,0.3)',

    // Borders
    border: PALETTE.mutedGray,
    borderLight: PALETTE.softGrayLavender,
    borderDark: PALETTE.darkSlate,

    // User type mapping
    canteen: PALETTE.softBlue,
    ngo: PALETTE.lightLavender,
    driver: PALETTE.darkSlate,

    // Gradients built from the palette
    gradients: {
      primary: [PALETTE.darkSlate, PALETTE.mutedGray],
      secondary: [PALETTE.softBlue, PALETTE.darkSlate],
      background: [PALETTE.lightLavender, PALETTE.softGrayLavender],
      card: [PALETTE.softBlue, PALETTE.lightLavender],
      header: [PALETTE.darkSlate, PALETTE.softBlue],
      button: [PALETTE.darkSlate, PALETTE.softBlue],
      accent: [PALETTE.lightLavender, PALETTE.softBlue],
      success: [PALETTE.softBlue, PALETTE.mutedGray],
    },
  },

  // Shadow Styles
  shadows: {
    small: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    button: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
  },

  // Typography
  typography: {
    textShadow: {
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    textShadowLight: {
      textShadowColor: 'rgba(0,0,0,0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
  },

  // Border Radius
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    xlarge: 24,
    round: 50,
  },

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
};

export default theme;