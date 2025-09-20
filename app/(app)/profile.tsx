import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import seedrandom from "seedrandom";

interface HealthMetrics {
  steps: number;
  water_intake: number;
  sleep_hours: number;
  emergency_contacts_count: number;
}

const getTodaysSeed = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (now.getHours() >= 7) {
    return today.getTime().toString();
  } else {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.getTime().toString();
  }
};

const generateRandomHealthMetrics = (date: Date) => {
  const seed = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const rng = seedrandom(seed);

  const waterIntake = Math.floor(rng() * 3 + 1);
  const sleepHours = Math.floor(rng() * 4 + 5);
  const steps = Math.floor(rng() * 4000 + 3000);

  return {
    water_intake: waterIntake,
    sleep_hours: sleepHours,
    steps: steps,
    emergency_contacts_count: 0, // This will be updated from the database
  };
};

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { session, signOut, isLoading } = useAuthStore();
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics>({
    steps: 0,
    water_intake: 0,
    sleep_hours: 0,
    emergency_contacts_count: 0,
  });
  const [loading, setLoading] = useState(true);

  const user = session?.user || {
    email: "user@example.com",
    user_metadata: {
      full_name: "Guest User",
      avatar_url:
        "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y",
    },
  };

  const updateHealthMetrics = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Get current emergency contacts count
      const { count: contactsCount } = await supabase
        .from("emergency_contacts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id);

      // Check if we have stored metrics for today
      const storedDate = await AsyncStorage.getItem("healthMetricsDate");
      let metrics = {
        water_intake: 0,
        sleep_hours: 0,
        steps: 0,
        emergency_contacts_count: contactsCount || 0,
      };

      if (storedDate && new Date(storedDate).getTime() === today.getTime()) {
        // Use stored metrics if they exist for today
        const storedMetrics = await AsyncStorage.getItem("healthMetrics");
        if (storedMetrics) {
          metrics = {
            ...metrics,
            ...JSON.parse(storedMetrics),
            // Always use the latest contacts count
            emergency_contacts_count: contactsCount || 0,
          };
        }
      } else {
        // Generate new random metrics for today
        const randomMetrics = generateRandomHealthMetrics(today);
        metrics = {
          ...randomMetrics,
          // Always use the latest contacts count
          emergency_contacts_count: contactsCount || 0,
        };

        // Store the new metrics and date
        await AsyncStorage.setItem("healthMetrics", JSON.stringify(metrics));
        await AsyncStorage.setItem("healthMetricsDate", today.toString());
      }

      // Update the database with the latest metrics
      if (session?.user?.id) {
        await supabase.from("health_metrics").upsert({
          ...metrics,
          user_id: session.user.id,
        });
      }

      // Update local state
      setHealthMetrics(metrics);
    } catch (error) {
      console.error("Error updating health metrics:", error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  // Initial fetch
  useEffect(() => {
    updateHealthMetrics();
  }, [updateHealthMetrics]);

  // Set up real-time subscription
  useEffect(() => {
    if (!session?.user?.id) return;

    const subscription = supabase
      .channel("health_metrics_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "health_metrics",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => updateHealthMetrics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [session?.user?.id, updateHealthMetrics]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/(auth)/login");
    } catch (error) {
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  const confirmLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: handleLogout },
    ]);
  };

  const stats = {
    workouts: 24,
    hours: 36,
    streak: 7,
  };

  const menuItems = [
    {
      id: "edit-profile",
      title: "Edit Profile",
      icon: "✏️",
      onPress: () => router.push("/(app)/edit-profile"),
    },
    {
      id: "add-emergency-contact",
      title: "Add Emergency Contact",
      icon: "🆘",
      onPress: () => router.push("/(app)/add-emergency-contact"),
    },
    {
      id: "privacy",
      title: "Privacy",
      icon: "🔒",
      onPress: () => router.push("/(app)/privacy"),
    },
    {
      id: "help",
      title: "Help & Support",
      icon: "❓",
      onPress: () =>
        Alert.alert(
          "Help & Support",
          "Please contact support@healthapp.com for assistance."
        ),
    },
    {
      id: "about",
      title: "About",
      icon: "ℹ️",
      onPress: () => router.push("/(app)/about"),
    },
  ];

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: "#151718" }}
    >
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri:
                    user.user_metadata?.avatar_url ||
                    "https://t4.ftcdn.net/jpg/02/29/75/83/360_F_229758328_7x8jwCwjtBMmC6rgFzLFhZoEpLobB6L8.jpg",
                }}
                style={styles.avatar}
                resizeMode="cover"
              />
            </View>

            <ThemedText type="title" style={styles.name}>
              {user.user_metadata?.full_name || "Guest User"}
            </ThemedText>
            <ThemedText style={styles.email}>{user.email}</ThemedText>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <ThemedText style={styles.statValue}>
                  {healthMetrics.steps.toLocaleString()}
                </ThemedText>
              )}
              <ThemedText style={styles.statLabel}>Steps</ThemedText>
            </View>
            <View
              style={[styles.statDivider, { backgroundColor: colors.border }]}
            />
            <View style={styles.statItem}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <ThemedText style={styles.statValue}>
                  {healthMetrics.water_intake.toFixed(1)}
                </ThemedText>
              )}
              <ThemedText style={styles.statLabel}>L water</ThemedText>
            </View>
            <View
              style={[styles.statDivider, { backgroundColor: colors.border }]}
            />
            <View style={styles.statItem}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <ThemedText style={styles.statValue}>
                  {healthMetrics.sleep_hours.toFixed(1)}
                </ThemedText>
              )}
              <ThemedText style={styles.statLabel}>hrs sleep</ThemedText>
            </View>
          </View>

          <View style={styles.menu}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                onPress={item.onPress}
              >
                <View style={styles.menuItemLeft}>
                  <ThemedText style={styles.menuItemIcon}>
                    {item.icon}
                  </ThemedText>
                  <ThemedText style={styles.menuItemText}>
                    {item.title}
                  </ThemedText>
                </View>
                <ThemedText>›</ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.logoutButton,
              { borderColor: "#262625", marginTop: 20 },
            ]}
            onPress={confirmLogout}
          >
            <ThemedText style={[styles.logoutText, { color: colors.tint }]}>
              Log Out
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    padding: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 60,
    backgroundColor: "#e1e1e1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    position: "relative",
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },
  avatarEdit: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEditText: {
    fontSize: 20,
    color: "#fff",
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 8,
  },
  menu: {
    marginTop: 24,
    width: "100%",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
    textAlign: "center",
  },
  email: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 4,
    textAlign: "center",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 24,
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  menuContainer: {
    backgroundColor: "transparent",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 24,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemIcon: {
    marginRight: 16,
    width: 24,
    textAlign: "center",
  },
  menuItemText: {
    fontSize: 16,
  },
  logoutButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 90,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
