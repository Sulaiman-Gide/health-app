import { Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth';

export default function AuthLayout() {
  const { session } = useAuthStore();
  const isAuthenticated = !!session?.user;

  return (
    <Stack screenOptions={{
      headerShown: false,
      animation: 'fade',
    }}>
      <Stack.Screen name="login" redirect={isAuthenticated} />
      <Stack.Screen name="signup" redirect={isAuthenticated} />
      <Stack.Screen name="forgot-password" redirect={isAuthenticated} />
      <Stack.Screen name="reset-password" redirect={isAuthenticated} />
    </Stack>
  );
}
