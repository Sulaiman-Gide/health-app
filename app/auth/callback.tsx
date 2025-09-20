import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function AuthCallback() {
  useEffect(() => {
    const handleDeepLink = async () => {
      let url: URL;

      try {
        url = new URL(location.href);

        if (url.hash) {
          const hashParams = new URLSearchParams(url.hash.substring(1));
          url.search = hashParams.toString();
        }
      } catch (error) {
        console.error("Error parsing URL:", error);
        router.replace("/(auth)/login");
        return;
      }

      const accessToken = url.searchParams.get("access_token");
      const refreshToken = url.searchParams.get("refresh_token");
      const type = url.searchParams.get("type");

      if (accessToken && refreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;

          useAuthStore.getState().setSession(data.session);

          // Navigate based on the link type
          if (type === "recovery") {
            router.replace("/(auth)/reset-password");
          } else {
            router.replace("/(app)");
          }
        } catch (error) {
          console.error("Error handling auth callback:", error);
          router.replace("/(auth)/login");
        }
      } else {
        router.replace("/(auth)/login");
      }
    };

    handleDeepLink();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 16 }}>Signing you in...</Text>
    </View>
  );
}
