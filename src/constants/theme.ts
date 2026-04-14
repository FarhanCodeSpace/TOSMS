/**
 * Application color palette based on TOSMS branding.
 */
export const COLORS = {
  primary: '#1A3C5E',
  onPrimary: '#FFFFFF',
  accent: '#F5A623',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  onSurface: '#212121',
  onSurfaceVariant: '#757575',
  error: '#F44336',
  success: '#4CAF50',
  text: '#212121',
  textSecondary: '#757575',
  outline: '#E0E0E0',
} as const;

/**
 * Standard font sizes used throughout the application.
 */
export const FONTS = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

/**
 * Consistent spacing units for layout and margins.
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
