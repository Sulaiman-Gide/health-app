import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, ColorSchemeName, getThemeColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

// This hook will protect the route access based on authentication state
function useProtectedRoute(isAuthenticated: boolean) {
  const segments = useSegments();
  const router = useRouter();
  const { isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to the sign-in page if not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect away from the sign-in page if authenticated
      router.replace('/(app)');
    }
  }, [isAuthenticated, segments, isLoading]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { session, isLoading: isAuthLoading } = useAuthStore();
  const isAuthenticated = !!session?.user;

  const router = useRouter();

  // Handle deep linking for email verification and password reset
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = new URL(event.url);
      const accessToken = url.searchParams.get('access_token');
      const refreshToken = url.searchParams.get('refresh_token');
      const type = url.searchParams.get('type');

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error && data.session) {
          useAuthStore.getState().setSession(data.session);
          
          if (type === 'recovery') {
            router.replace('/(auth)/reset-password');
          } else {
            router.replace('/(app)');
          }
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check if the app was opened with a deep link
    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink({ url: initialUrl });
      }
    };
    
    getInitialURL();
    
    return () => {
      subscription.remove();
    };
  }, []);

  useProtectedRoute(isAuthenticated);

  if (isAuthLoading) {
    const colors = getThemeColors(colorScheme);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{
          headerShown: false,
          animation: 'fade',
        }} />
        <Toast />
      </ThemeProvider>
    </>
  );
}
