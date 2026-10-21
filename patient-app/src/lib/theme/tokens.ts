/**
 * Design tokens ported from the CannaQuest patient web app
 * (paitent-design/css/patient-app.css). Keep these in sync with the
 * source CSS custom properties — do not hand-invent new colors here;
 * pull them from the web reference first.
 */

export const colors = {
    // Brand
    primaryGreen: '#0e3017',
    accentLime: '#d2ffa0',
    brandBlack: '#000000',

    // Hero gradient stops
    heroGradientStart: '#3a6b40',
    heroGradientMid: '#1e4a25',
    heroGradientEnd: '#143318',
    heroBgStart: '#2a5a30',
    heroBgEnd: '#173520',

    // Lime gradient (buttons)
    limeGradientStart: '#D2FFA0',
    limeGradientEnd: '#B8E88A',

    // Base surface
    background: '#f8f6ee', // hsl(48 30% 96%)
    foreground: '#0d1f12', // hsl(150 30% 8%)
    card: '#fdfdf9', // hsl(60 20% 99%)
    cardForeground: '#0d1f12',

    secondary: '#eef0e7', // hsl(80 15% 93%)
    secondaryForeground: '#0d1f12',
    muted: '#e7e9de', // hsl(80 10% 90%)
    mutedForeground: '#5f6b61', // hsl(150 10% 40%)

    accent: '#d2ffa0',
    accentForeground: '#0e3017',

    destructive: '#c62e2e', // hsl(0 62% 50%)
    destructiveForeground: '#ffffff',

    border: '#e2e4d7', // hsl(80 12% 88%)
    input: '#e2e4d7',
    ring: '#0e3017',

    // Status colors
    statusEmerald: '#15a05a', // hsl(152 69% 40%)
    statusAmber: '#f2a30f', // hsl(38 92% 50%)
    statusRed: '#e23c3c', // hsl(0 72% 51%)
    statusBlue: '#3b82f6', // hsl(217 91% 60%)
    statusGray: '#71757e', // hsl(230 7% 47%)

    // Glass surfaces
    glassBg: 'rgba(255, 255, 255, 0.62)',
    glassBorder: 'rgba(255, 255, 255, 0.65)',
    glassBorderOuter: 'rgba(25, 66, 32, 0.08)',
    glassHighlight: 'rgba(255, 255, 255, 0.75)',
    glassBgStrong: 'rgba(255, 255, 255, 0.78)',
    glassBorderStrong: 'rgba(255, 255, 255, 0.75)',

    surfaceCardBg: 'rgba(255, 255, 255, 0.72)',
    surfaceCardBorder: 'rgba(255, 255, 255, 0.7)',

    glassCardSmBg: 'rgba(255, 255, 255, 0.62)',
    glassCardSmBorder: 'rgba(255, 255, 255, 0.65)',

    todayHeroPanelBorder: 'rgba(255, 255, 255, 0.6)',

    heroConfirmedPillBg: 'rgba(255, 255, 255, 0.15)',
    heroConfirmedPillBorder: 'rgba(255, 255, 255, 0.25)',

    appointmentReminderStart: '#245f2d',
    appointmentReminderEnd: '#0e3017',
    appointmentReminderBorder: 'rgba(255, 255, 255, 0.12)',

    journeyBookingCardBg: 'rgba(255, 255, 255, 0.54)',
    journeyBookingCardBorder: 'rgba(14, 48, 23, 0.1)',
    journeyBookingIconBg: '#e0ebdf',

    dashedStepLine: 'rgba(14, 48, 23, 0.32)',

    glassOutlineBg: 'rgba(255, 255, 255, 0.5)',
    glassOutlineBorder: 'rgba(20, 32, 24, 0.12)',

    emeraldChipBg: '#ecfdf5',
    emeraldChipBorder: '#bbf7d0',
    emeraldChipText: '#065f46',

    // Grayscale helpers
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    brandLime: '#bcf27f',

    white: '#ffffff',
} as const;

export const radii = {
    sm: 8,
    md: 11,
    lg: 16,
    xl: 20,
    xxl: 26, // today-hero-panel
    full: 999,
} as const;

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
} as const;

export const typography = {
    regular: 'Manrope_400Regular',
    medium: 'Manrope_500Medium',
    semiBold: 'Manrope_600SemiBold',
    bold: 'Manrope_700Bold',
    extraBold: 'Manrope_800ExtraBold',
} as const;

/**
 * Shadow tiers, translated from CSS box-shadow to RN shadow props.
 * RN has no multi-layer shadow, so each tier picks the dominant layer.
 * elevation is Android's shadow equivalent.
 */
export const shadows = {
    tier1: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
        elevation: 3,
    },
    tier2: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 23,
        elevation: 5,
    },
    tier3: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 22 },
        shadowOpacity: 0.12,
        shadowRadius: 35,
        elevation: 8,
    },
    lime: {
        shadowColor: '#D2FFA0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 4,
    },
} as const;

export const brandLabel = {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.3, // 0.12em at 11px
    color: colors.mutedForeground,
};
