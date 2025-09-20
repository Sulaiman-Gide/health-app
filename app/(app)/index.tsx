import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getThemeColors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { HealthMetrics } from "@/types/health";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import seedrandom from "seedrandom";

// Utility functions
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 18) return "Good afternoon,";
  return "Good evening,";
};

const getTodaysSeed = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Only update the seed after 7 AM
  if (now.getHours() >= 7) {
    return today.getTime().toString();
  } else {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.getTime().toString();
  }
};

const generateDailyValues = (seed: string) => {
  const rng = seedrandom(seed);

  return {
    waterIntake: parseFloat((rng() * 1.5 + 1).toFixed(1)),
    sleepHours: parseFloat((rng() * 3 + 5).toFixed(1)),
    waterGlasses: Math.floor(rng() * 4 + 2),
    steps: Math.floor(rng() * 3000 + 2000),
  };
};

interface HealthMetric {
  id: string;
  title: string;
  value: number;
  unit: string;
  icon: string;
  color: string;
  goal: number;
  current: number;
  progress?: number;
  displayValue?: string;
}

interface HealthMetricParams {
  title: string;
  current: number;
  goal: number;
  unit: string;
}

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const HealthCard = ({
  title,
  value,
  unit,
  icon,
  onPress,
  color,
  isLoading = false,
}: {
  title: string;
  value: number;
  unit: string;
  icon: string;
  onPress: () => void;
  color: string;
  isLoading?: boolean;
}) => {
  // Ensure value is a number
  const numericValue =
    typeof value === "number" ? value : parseFloat(value) || 0;

  // Format the value based on the unit
  const formatValue = (val: number) => {
    if (unit === "hrs" || unit === "L / day") {
      return val.toFixed(1);
    }
    return val.toLocaleString();
  };

  return (
    <TouchableOpacity
      style={[styles.healthCard, { backgroundColor: color + "20" }]}
      onPress={onPress}
      disabled={isLoading}
    >
      <View style={styles.healthCardContent}>
        <View>
          <ThemedText style={styles.healthCardTitle}>{title}</ThemedText>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={color} />
            </View>
          ) : (
            <ThemedText style={styles.healthCardValue}>
              {formatValue(numericValue)}{" "}
              <ThemedText style={styles.healthCardUnit}>{unit}</ThemedText>
            </ThemedText>
          )}
        </View>
        <ThemedText style={styles.healthCardIcon}>{icon}</ThemedText>
      </View>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const { session } = useAuthStore();
  const router = useRouter();

  // State management
  const [greeting] = useState(getTimeBasedGreeting());
  const [dailyValues, setDailyValues] = useState(() =>
    generateDailyValues(getTodaysSeed())
  );
  const [healthMetrics, setHealthMetrics] = useState<Partial<HealthMetrics>>(
    {}
  );
  const [healthData, setHealthData] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [location, setLocation] = useState<{
    city: string | null;
    region: string | null;
  } | null>(null);

  const generateRandomHealthMetrics = (date: Date) => {
    const seed = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const rng = seedrandom(seed);

    const waterIntake = Math.floor(rng() * 3 + 1);
    const sleepHours = Math.floor(rng() * 4 + 5);
    const steps = Math.floor(rng() * 4000 + 3000);

    return {
      waterIntake,
      sleepHours,
      steps,
      emergency_contacts_count: healthMetrics.emergency_contacts_count || 0,
    };
  };

  useEffect(() => {
    const updateHealthMetrics = async () => {
      try {
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );

        // Get current emergency contacts count
        const { count: contactsCount } = await supabase
          .from("emergency_contacts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session?.user?.id || "");

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

        setHealthMetrics(metrics);
      } catch (error) {
        //console.error("Error updating health metrics:", error);
      }
    };

    updateHealthMetrics();

    // Set up a check for 7 AM to update the metrics
    const now = new Date();
    let timeUntil7AM =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        7,
        0,
        0,
        0
      ).getTime() - now.getTime();

    // If it's already past 7 AM, set the timer for 7 AM tomorrow
    if (timeUntil7AM < 0) {
      timeUntil7AM += 24 * 60 * 60 * 1000; // Add 24 hours
    }

    const timer = setTimeout(() => {
      updateHealthMetrics();
      // Then update every 24 hours
      const dailyTimer = setInterval(updateHealthMetrics, 24 * 60 * 60 * 1000);
      return () => clearInterval(dailyTimer);
    }, timeUntil7AM);

    return () => clearTimeout(timer);
  }, [healthMetrics.emergency_contacts_count]);

  // Update health data display when metrics change
  useEffect(() => {
    const updatedHealthData: HealthMetric[] = [
      {
        id: "water",
        title: "Water Intake",
        value: healthMetrics.water_intake || 0,
        unit: "L / day",
        icon: "",
        color: "#00BCD4",
        goal: 3, // Max random value
        current: healthMetrics.water_intake || 0,
        progress: Math.min(
          100,
          Math.round(((healthMetrics.water_intake || 0) / 3) * 100)
        ),
        displayValue: (healthMetrics.water_intake || 0).toFixed(1),
      },
      {
        id: "sleep",
        title: "Sleep",
        value: healthMetrics.sleep_hours || 0,
        unit: "hrs",
        icon: "",
        color: "#2196F3",
        goal: 8, // Max random value
        current: healthMetrics.sleep_hours || 0,
        progress: Math.min(
          100,
          Math.round(((healthMetrics.sleep_hours || 0) / 8) * 100)
        ),
        displayValue: (healthMetrics.sleep_hours || 0).toFixed(1),
      },
      {
        id: "steps",
        title: "Daily Steps",
        value: healthMetrics.steps || 0,
        unit: "steps",
        icon: "",
        color: "#4CAF50",
        goal: 7000, // Max random value
        current: healthMetrics.steps || 0,
        progress: Math.min(
          100,
          Math.round(((healthMetrics.steps || 0) / 7000) * 100)
        ),
        displayValue: (healthMetrics.steps || 0).toLocaleString(),
      },
      {
        id: "contacts",
        title: "Emergency",
        value: healthMetrics.emergency_contacts_count || 0,
        unit: "saved",
        icon: "",
        color: "#9C27B0",
        goal: 3,
        current: healthMetrics.emergency_contacts_count || 0,
        progress: Math.min(
          100,
          Math.round(((healthMetrics.emergency_contacts_count || 0) / 3) * 100)
        ),
        displayValue: (healthMetrics.emergency_contacts_count || 0).toString(),
      },
    ];

    setHealthData(updatedHealthData);
  }, [healthMetrics]);

  // Update values when the day changes (after 7 AM)
  useEffect(() => {
    const checkForNewDay = async () => {
      const now = new Date();
      if (now.getHours() >= 7) {
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        try {
          const lastUpdate = await AsyncStorage.getItem("lastUpdate");

          if (!lastUpdate || new Date(lastUpdate) < today) {
            const newSeed = getTodaysSeed();
            setDailyValues(generateDailyValues(newSeed));
            await AsyncStorage.setItem("lastUpdate", today.toString());
          }
        } catch (error) {
          // console.error("Error checking for new day:", error);
        }
      }
    };

    checkForNewDay();
    const interval = setInterval(checkForNewDay, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Function to get user's location
  const getLocation = async () => {
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.log("Permission to access location was denied");
        return;
      }

      // Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low, // Lower accuracy is sufficient for city/region
      });

      // Reverse geocode to get address
      const address = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      if (address.length > 0) {
        setLocation({
          city: address[0].city || null,
          region: address[0].region || null,
        });
      }
    } catch (error) {
      //console.error("Error getting location:", error);
    }
  };

  useEffect(() => {
    // Fetch location when component mounts
    getLocation();

    const fetchData = async () => {
      const now = new Date();
      if (now.getHours() >= 7) {
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        try {
          const lastUpdate = await AsyncStorage.getItem("lastUpdate");

          if (!lastUpdate || new Date(lastUpdate) < today) {
            const newSeed = getTodaysSeed();
            setDailyValues(generateDailyValues(newSeed));
            await AsyncStorage.setItem("lastUpdate", today.toString());
          }
        } catch (error) {
          //console.error("Error checking for new day:", error);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const user = {
    ...(session?.user || {
      user_metadata: {
        full_name: "User",
        avatar_url:
          "https://t4.ftcdn.net/jpg/02/29/75/83/360_F_229758328_7x8jwCwjtBMmC6rgFzLFhZoEpLobB6L8.jpg",
      },
    }),
    id: session?.user?.id || "default-user-id",
  };
  const colors = getThemeColors(colorScheme);

  // Initialize step counter
  //useEffect(() => {
  //  const init = async () => {
  //    try {
  //     await initStepCounter();
  //     const currentSteps = await getCurrentStepCount();
  //      setSteps(currentSteps);
  //   } catch (error) {
  //     console.error("Error initializing step counter:", error);
  //   }
  // };
  //  init();
  //}, []);

  const fetchHealthMetrics = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);

      // Get emergency contacts directly to ensure we have the latest count
      const { data: contacts, error: contactsError } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", session.user.id);

      if (contactsError) throw contactsError;

      const contactsCount = contacts?.length || 0;

      // Update or create health metrics with the latest contacts count
      const { data: updatedMetrics, error: updateError } = await supabase
        .from("health_metrics")
        .upsert(
          {
            user_id: session.user.id,
            emergency_contacts_count: contactsCount,
            // Only set these on initial creation
            ...(!healthMetrics.water_intake && { water_intake: 0 }),
            ...(!healthMetrics.sleep_hours && { sleep_hours: 0 }),
            ...(!healthMetrics.steps && { steps: 0 }),
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (updateError) throw updateError;

      if (updatedMetrics) {
        // Merge with existing metrics to preserve any local random values
        setHealthMetrics((prev) => ({
          ...prev,
          ...updatedMetrics,
          // Ensure we don't override the random values with 0
          water_intake: prev?.water_intake || updatedMetrics.water_intake || 0,
          sleep_hours: prev?.sleep_hours || updatedMetrics.sleep_hours || 0,
          steps: prev?.steps || updatedMetrics.steps || 0,
          emergency_contacts_count: contactsCount,
        }));
      }
    } catch (error) {
      console.log("Error in fetchHealthMetrics:", error);
    } finally {
      setLoading(false);
    }
  }, [session, healthMetrics]);

  // Fetch health metrics when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchHealthMetrics();
    }, [fetchHealthMetrics])
  );

  // Initial fetch on component mount
  useEffect(() => {
    fetchHealthMetrics();
  }, [fetchHealthMetrics]);

  // Set up realtime subscription for health metrics
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
        () => fetchHealthMetrics()
      )
      .subscribe();

    // Set up subscription for emergency contacts changes
    const contactsSubscription = supabase
      .channel("emergency_contacts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_contacts",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => fetchHealthMetrics()
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(subscription);
      supabase.removeChannel(contactsSubscription);
    };
  }, [session?.user?.id, fetchHealthMetrics]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#151718" }}>
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.greeting}>
                {getTimeBasedGreeting()}{" "}
                {session?.user?.user_metadata?.full_name || "User"}
              </ThemedText>
              <ThemedText style={styles.locationText}>
                {location
                  ? `${location.city || ""}${
                      location.city && location.region ? ", " : ""
                    }${location.region || ""}` || "Location unavailable"
                  : "Location unavailable"}
              </ThemedText>
            </View>
            <TouchableOpacity onPress={() => router.push("/(app)/profile")}>
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
            </TouchableOpacity>
          </View>

          <View>
            <ThemedText
              type="subtitle"
              style={{ fontSize: 18, marginBottom: 16 }}
            >
              Today's Target
            </ThemedText>

            <View style={styles.healthGrid}>
              {healthData.map((item) => (
                <HealthCard
                  key={item.id}
                  title={item.title}
                  value={item.value}
                  unit={item.unit}
                  icon={item.icon}
                  color={item.color}
                  onPress={() => {
                    if (item.id === "contacts") {
                      router.navigate({
                        pathname: "/(app)/emergency-contacts",
                        params: { userId: session?.user?.id },
                      });
                    } else {
                      const params: HealthMetricParams = {
                        title: item.title,
                        current: item.current,
                        goal: item.goal,
                        unit: item.unit,
                      };
                    }
                  }}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Main container styles
  container: {
    flex: 1,
    backgroundColor: "#151718",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Header styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    color: "#6B7280",
  },
  username: {
    fontSize: 24,
    color: "#efefef",
  },

  // Avatar styles
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },

  // Health grid and card styles
  healthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  healthCard: {
    width: "48%",
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  healthCardContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  healthCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  healthCardValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginVertical: 10,
  },
  healthCardUnit: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  healthCardIcon: {
    fontSize: 22,
  },
  loadingContainer: {
    height: 40,
    justifyContent: "center",
    marginVertical: 10,
  },
});
