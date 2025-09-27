import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Stack, useRouter } from "expo-router";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

export default function AdminLayout() {
  const { session, isAdmin, isLoading, signOut } = useAuthStore();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!session || !isAdmin) {
    return <Redirect href="/(auth)/login" />;
  }

  const headerOptions = {
    headerStyle: {
      backgroundColor: colorScheme === "dark" ? "#121212" : "#fff",
    },
    headerTintColor: colorScheme === "dark" ? "#fff" : "#000",
    headerRight: () => (
      <TouchableOpacity
        onPress={async () => {
          await signOut();
          router.replace("/(auth)/login");
        }}
        style={styles.logoutButton}
      >
        <Ionicons name="log-out-outline" size={24} color={colors.tint} />
      </TouchableOpacity>
    ),
  };

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="emergencies" />
      <Stack.Screen name="users" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutButton: {
    marginRight: 16,
    padding: 4,
  },
});
