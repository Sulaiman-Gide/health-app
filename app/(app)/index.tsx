import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getThemeColors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { HealthMetrics } from "@/types/health";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { debounce } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
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

const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean;
  return function (this: any, ...args: any[]) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
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
  const [greeting, setGreeting] = useState<string>(getTimeBasedGreeting());
  const [dailyValues, setDailyValues] = useState<HealthMetrics>(
    generateDailyValues(getTodaysSeed())
  );
  const [healthMetrics, setHealthMetrics] = useState<Partial<HealthMetrics>>(
    {}
  );
  const [healthData, setHealthData] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  interface LocationInfo {
    city: string | null;
    region: string | null;
    latitude: number | null;
    longitude: number | null;
  }

  const [isSendingEmergency, setIsSendingEmergency] = useState(false);
  const [lastGeocodeTime, setLastGeocodeTime] = useState<number>(0);
  const [geocodeCache, setGeocodeCache] = useState<{ [key: string]: any }>({});
  const mapRef = useRef<MapView>(null);
  // Add these state variables at the top of your HomeScreen component
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [locationInfo, setLocationInfo] = useState<{
    city: string | null;
    region: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null>(null);

  // Send emergency report
  const sendEmergencyReport = async () => {
    if (!location) {
      Alert.alert(
        "Location Error",
        "Please enable location services to send an emergency report"
      );
      return;
    }

    try {
      setIsSendingEmergency(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("blood_type, seasonal_allergies, medications")
        .eq("id", session?.user.id)
        .single();

      const { error } = await supabase.from("emergency_reports").insert([
        {
          user_id: session?.user.id,
          blood_type: profile?.blood_type,
          seasonal_allergies: profile?.seasonal_allergies,
          medications: profile?.medications,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          status: "pending",
        },
      ]);

      if (error) throw error;

      // Format address using cached location info if available
      let formattedAddress = "Unknown location";

      if (locationInfo && locationInfo.city && locationInfo.region) {
        // Use cached location info
        formattedAddress = `${locationInfo.city}, ${locationInfo.region}`;
      } else {
        try {
          // Fallback to reverse geocoding if no cached info
          const address = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          if (address[0]) {
            formattedAddress = `${address[0].name || ""} ${
              address[0].street || ""
            } ${address[0].city || ""} ${address[0].region || ""}`.trim();
          }
        } catch (error) {
          console.warn("Error getting address for emergency report:", error);
          // Use coordinates as fallback
          formattedAddress = `Location: ${location.coords.latitude.toFixed(
            4
          )}, ${location.coords.longitude.toFixed(4)}`;
        }
      }

      Alert.alert(
        "Emergency Alert Sent",
        "Help is on the way! Your location and medical information have been shared with emergency contacts."
      );
    } catch (error) {
      console.log("Error sending emergency report:", error);
      Alert.alert(
        "Error",
        "Failed to send emergency report. Please try again."
      );
    } finally {
      setIsSendingEmergency(false);
    }
  };

  const getLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission to access location was denied");
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });

      setLocation(position);

      // Generate a cache key based on coordinates (rounded to 4 decimal places)
      const cacheKey = `${position.coords.latitude.toFixed(
        4
      )},${position.coords.longitude.toFixed(4)}`;

      // Check cache first
      if (geocodeCache[cacheKey]) {
        setLocationInfo(geocodeCache[cacheKey]);
        return;
      }

      // Rate limiting - don't make more than 1 request per 2 seconds
      const now = Date.now();
      if (now - lastGeocodeTime < 2000) {
        console.log("Skipping geocode - rate limited");
        return;
      }

      setLastGeocodeTime(now);

      try {
        const address = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (address.length > 0) {
          const locationInfo = {
            city: address[0].city || null,
            region: address[0].region || null,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          // Cache the result
          setGeocodeCache((prev) => ({
            ...prev,
            [cacheKey]: locationInfo,
          }));

          setLocationInfo(locationInfo);
        }
      } catch (geocodeError) {
        console.warn("Reverse geocoding error:", geocodeError);
        // Don't throw the error, just log it
      }
    } catch (error) {
      console.error("Error getting location:", error);
    }
  }, [geocodeCache, lastGeocodeTime]);

  // Debounce the location updates
  const debouncedGetLocation = useCallback(
    debounce(() => {
      getLocation();
    }, 1000), // 1 second debounce
    [getLocation]
  );

  useEffect(() => {
    debouncedGetLocation();
    // Cleanup
    return () => {
      debouncedGetLocation.cancel();
    };
  }, [debouncedGetLocation]);

  const generateRandomHealthMetrics = (date: Date) => {
    // Create a more unique seed by including hours and minutes
    const seed = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
    const rng = seedrandom(seed);

    // Generate random values with minimum thresholds
    const water_intake = Math.max(1, Math.floor(rng() * 3 + 1)); // 1-3
    const sleep_hours = Math.max(1, parseFloat((rng() * 4 + 5).toFixed(1))); // 5.0-9.0 with 1 decimal
    const steps = Math.max(1000, Math.floor(rng() * 4000 + 3000)); // 3000-6999

    return {
      water_intake,
      sleep_hours,
      steps,
      emergency_contacts_count: healthMetrics.emergency_contacts_count || 0,
    };
  };

  // Clear any existing stored metrics to ensure fresh data
  const clearStoredMetrics = async () => {
    try {
      await AsyncStorage.removeItem("healthMetrics");
      await AsyncStorage.removeItem("healthMetricsDate");
      console.log("Stored metrics cleared successfully");
    } catch (error) {
      console.error("Error clearing stored metrics:", error);
    }
  };

  // Call this function once to clear any existing stored metrics
  useEffect(() => {
    clearStoredMetrics();
  }, []);

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

  useEffect(() => {
    // Fetch location when component mounts using debounced version
    debouncedGetLocation();

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

  // Set up realtime subscriptions and location updates
  useEffect(() => {
    if (!session?.user?.id) return;

    let isMounted = true;
    let locationSubscription: Location.LocationSubscription | null = null;
    let healthSubscription: any = null;
    let contactsSubscription: any = null;

    // Set up location updates
    const setupLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission to access location was denied");
          return;
        }

        // Get initial position
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });

        if (isMounted) {
          setLocation(position);

          // Use debounced getLocation which includes caching and rate limiting
          debouncedGetLocation();
        }

        // Watch position with lower accuracy and higher distance interval to reduce updates
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Low, // Lower accuracy to reduce battery usage
            distanceInterval: 100, // Update every 100 meters instead of 10
            timeInterval: 30000, // Update at most every 30 seconds
          },
          (newLocation) => {
            if (isMounted) {
              setLocation(newLocation);
              // Use debounced version which includes rate limiting
              debouncedGetLocation();
            }
          }
        );
      } catch (error) {
        console.error("Error getting location:", error);
      }
    };

    // Set up health metrics subscription
    healthSubscription = supabase
      .channel("health_metrics_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "health_metrics",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          if (isMounted) {
            fetchHealthMetrics();
          }
        }
      )
      .subscribe();

    // Set up emergency contacts subscription
    contactsSubscription = supabase
      .channel("emergency_contacts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_contacts",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          if (isMounted) {
            fetchHealthMetrics();
          }
        }
      )
      .subscribe();

    // Initialize location
    setupLocation();

    // Cleanup function
    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (healthSubscription) {
        supabase.removeChannel(healthSubscription);
      }
      if (contactsSubscription) {
        supabase.removeChannel(contactsSubscription);
      }
    };
  }, [session?.user?.id, fetchHealthMetrics]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#151718" }}>
      <StatusBar style="light" />
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
                {locationInfo
                  ? `${locationInfo.city || ""}${
                      locationInfo.city && locationInfo.region ? ", " : ""
                    }${locationInfo.region || ""}`
                  : "Location not available"}
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
                        pathname: "/(app)/stats",
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

          {/* Map View */}
          <View style={styles.mapContainer}>
            {location ? (
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
                followsUserLocation={true}
                showsCompass={true}
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={true}
                rotateEnabled={true}
              >
                <Marker
                  coordinate={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                  }}
                  title="Your Location"
                  description="Your current location will be shared in emergency"
                />
              </MapView>
            ) : (
              <View style={styles.mapPlaceholder}>
                <ActivityIndicator size="large" color={colors.tint} />
                <ThemedText style={styles.loadingText}>
                  Loading map...
                </ThemedText>
              </View>
            )}
          </View>

          {/* Emergency Button */}
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={sendEmergencyReport}
            disabled={isSendingEmergency}
          >
            {isSendingEmergency ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="warning"
                  size={24}
                  color="#fff"
                  style={styles.emergencyIcon}
                />
                <ThemedText style={styles.emergencyButtonText}>
                  SEND EMERGENCY ALERT
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Map styles
  mapContainer: {
    height: 300,
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#fff",
  },
  // Emergency button styles
  emergencyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF3B30",
    padding: 16,
    borderRadius: 12,
    marginBottom: 80,
  },
  emergencyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  emergencyIcon: {
    marginRight: 10,
  },
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
