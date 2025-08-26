export const theme = {
  colors: {
    primary: '#e65259',
    primaryLight: '#ff7b7f',
    primaryDark: '#c73e44',
    background: '#fefefe',
    surface: '#ffffff',
    text: '#2c2c2c',
    textSecondary: '#666666',
    textLight: '#999999',
    border: '#e0e0e0',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    overlay: 'rgba(0, 0, 0, 0.5)',
    coral: '#ff6b6b',
    peach: '#ffd93d',
    lavender: '#a8e6cf',
  },
  fonts: {
    heading: 'System', // In production, use a serif font
    body: 'System',
    script: 'System', // In production, use a script font
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};