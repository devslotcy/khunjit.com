import { useColorScheme } from 'react-native';
import { colors } from './colors';

export { colors };

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    isDark,
    colors: {
      primary: colors.primary,
      primaryLight: colors.primaryLight,
      secondary: colors.secondary,
      background: isDark ? colors.backgroundDark : colors.background,
      card: isDark ? colors.cardDark : colors.card,
      text: isDark ? colors.textDark : colors.text,
      textMuted: isDark ? colors.textMutedDark : colors.textMuted,
      border: isDark ? colors.borderDark : colors.border,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
      white: colors.white,
      black: colors.black,
    },
  };
};
