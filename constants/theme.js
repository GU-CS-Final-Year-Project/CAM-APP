import { Platform } from 'react-native';

export const COLORS = {
  primary: '#2E7D32',
  primaryDark: '#1B5E20',
  primaryLight: '#4CAF50',
  accent: '#388E3C',
  background: '#E8F5E9',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#1B5E20',
  textSecondary: '#558B2F',
  textLight: '#8bc34a',
  border: '#C8E6C9',
  error: '#E74C3C',
  warning: '#F39C12',
  info: '#2196F3',
  white: '#FFFFFF',
  black: '#000000',
  grey: '#9E9E9E',
  lightGrey: '#F5F5F5',
  darkGrey: '#616161',
  headerBg: '#2E7D32',
  headerText: '#FFFFFF',
  statBg: '#E8F5E9',
  cardBorder: '#C8E6C9',
};

export const FONTS = {
  regular: 'Roboto_400Regular',
  medium: 'Roboto_500Medium',
  bold: 'Roboto_700Bold',
  black: 'Roboto_900Black',
};

export const SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 26,
  title: 28,
  padding: 16,
  margin: 16,
  radius: 12,
  radiusLg: 16,
  radiusXl: 20,
};

export const SHADOWS = {
  small: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    },
    android: { elevation: 3 },
  }),
  medium: Platform.select({
    ios: {
      shadowColor: '#2E7D32',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: { elevation: 6 },
  }),
  large: Platform.select({
    ios: {
      shadowColor: '#2E7D32',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    android: { elevation: 10 },
  }),
};
