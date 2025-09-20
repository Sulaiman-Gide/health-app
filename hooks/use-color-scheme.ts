import { ColorSchemeName } from '@/constants/theme';

// Always return 'dark' theme regardless of system settings
export function useColorScheme(): ColorSchemeName {
  return 'dark';
}
