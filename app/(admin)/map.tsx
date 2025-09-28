import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

type MapParams = {
  latitude: string;
  longitude: string;
  title: string;
  description: string;
};

export default function EmergencyMapScreen() {
  const params = useLocalSearchParams<MapParams>();
  const router = useRouter();
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<string | null>(null);

  const emergencyLocation = {
    latitude: parseFloat(params.latitude),
    longitude: parseFloat(params.longitude),
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);

      // Calculate distance
      const distanceInKm = calculateDistance(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        emergencyLocation.latitude,
        emergencyLocation.longitude
      );
      setDistance(distanceInKm);

      // Get directions
      getDirections(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        emergencyLocation.latitude,
        emergencyLocation.longitude
      );
    })();
  }, []);

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return parseFloat(distance.toFixed(2));
  };

  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };

  const getDirections = async (
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ) => {
    try {
      // Use Expo's Location API to get directions
      const result = await Location.reverseGeocodeAsync({
        latitude: endLat,
        longitude: endLng,
      });

      if (result.length > 0) {
        const address = result[0];
        const label = `${address.name || ""} ${address.street || ""} ${
          address.city || ""
        } ${address.region || ""} ${address.postalCode || ""}`.trim();

        // Open in device's default maps app
        const url = Platform.select({
          ios: `maps://app?daddr=${endLat},${endLng}(${label})`,
          android: `google.navigation:q=${endLat},${endLng}(${label})`,
        });

        if (url) {
          // Calculate approximate distance and duration
          const distance = calculateDistance(
            startLat,
            startLng,
            endLat,
            endLng
          );
          const durationMinutes = Math.round((distance / 50) * 60); // Rough estimate: 50 km/h average speed
          setDuration(`${durationMinutes} min`);

          return url;
        }
      }

      // Fallback to web URL if platform-specific URL fails
      return `https://www.google.com/maps/dir/?api=1&destination=${endLat},${endLng}`;
    } catch (error) {
      console.log("Error getting directions:", error);
      return `https://www.google.com/maps/dir/?api=1&destination=${endLat},${endLng}`;
    }
  };

  const openInMaps = async () => {
    if (!location) return;

    try {
      const url = await getDirections(
        location.coords.latitude,
        location.coords.longitude,
        emergencyLocation.latitude,
        emergencyLocation.longitude
      );

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to web URL
        await Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${emergencyLocation.latitude},${emergencyLocation.longitude}`
        );
      }
    } catch (error) {
      console.log("Error opening maps:", error);
    }
  };

  if (!location) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <ThemedText style={styles.loadingText}>
          Getting your location...
        </ThemedText>
      </ThemedView>
    );
  }

  // Function to calculate the region that fits both points with padding
  const calculateRegion = (
    loc1: { latitude: number; longitude: number },
    loc2: { latitude: number; longitude: number }
  ) => {
    const minLat = Math.min(loc1.latitude, loc2.latitude);
    const maxLat = Math.max(loc1.latitude, loc2.latitude);
    const minLng = Math.min(loc1.longitude, loc2.longitude);
    const maxLng = Math.max(loc1.longitude, loc2.longitude);

    // Calculate deltas with padding
    const latDelta = (maxLat - minLat) * 1.5;
    const lngDelta = (maxLng - minLng) * 1.5;

    // Ensure minimum zoom level
    const minDelta = 0.01; // Approximately 1km

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(latDelta, minDelta),
      longitudeDelta: Math.max(lngDelta, minDelta * (width / height)),
    };
  };

  const region = location
    ? calculateRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        emergencyLocation
      )
    : {
        ...emergencyLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01 * (width / height),
      };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: "#0F172A" }]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <View
              style={{
                backgroundColor: "#142347",
                padding: 12,
                borderWidth: 1,
                borderColor: "#18274a50",
                borderRadius: 72,
              }}
            >
              <Ionicons name="arrow-back" size={24} color={"#fff"} />
            </View>
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            Emergency Location
          </ThemedText>
          <View
            style={{
              padding: 12,
              borderWidth: 1,

              borderRadius: 72,
            }}
          />
          <View />
        </View>

        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={region}
            region={region}
            onMapReady={() => {}}
            onRegionChangeComplete={(r) => console.log("Region changed:", r)}
            showsUserLocation
            showsMyLocationButton
            showsCompass
            showsScale
            showsTraffic
            showsIndoors
            showsBuildings
            rotateEnabled
            zoomEnabled
            zoomControlEnabled
            loadingEnabled
            loadingIndicatorColor="#666666"
            loadingBackgroundColor="#eeeeee"
          >
            <Marker
              coordinate={{
                latitude: emergencyLocation.latitude,
                longitude: emergencyLocation.longitude,
              }}
              title="Emergency Location"
              description={params.description}
            >
              <View style={styles.emergencyMarker}>
                <Ionicons name="alert-circle" size={32} color="#FF3B30" />
              </View>
            </Marker>

            <Polyline
              coordinates={[
                {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                },
                {
                  latitude: emergencyLocation.latitude,
                  longitude: emergencyLocation.longitude,
                },
              ]}
              strokeColor="#FF3B30"
              strokeWidth={2}
              lineDashPattern={[10, 10]}
            />
          </MapView>

          <View style={styles.detailsContainer}>
            <ThemedText type="subtitle" style={styles.detailTitle}>
              Emergency Location
            </ThemedText>
            <ThemedText style={styles.detailText}>
              {params.description}
            </ThemedText>

            <View style={styles.distanceContainer}>
              <View style={styles.distanceItem}>
                <Ionicons name="navigate" size={20} color="#666" />
                <ThemedText style={styles.distanceText}>
                  {distance} km away
                </ThemedText>
              </View>
              {duration && (
                <View style={styles.distanceItem}>
                  <Ionicons name="time" size={20} color="#666" />
                  <ThemedText style={styles.distanceText}>
                    {duration} by car
                  </ThemedText>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.directionsButton}
              onPress={openInMaps}
            >
              <Ionicons name="navigate" size={20} color="white" />
              <ThemedText style={styles.directionsButtonText}>
                Get Directions
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
  },
  emergencyMarker: {
    backgroundColor: "transparent",
  },
  detailsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  detailTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  detailText: {
    color: "#666",
    marginBottom: 16,
  },
  distanceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  distanceItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  distanceText: {
    marginLeft: 8,
    color: "#efefef",
  },
  directionsButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  directionsButtonText: {
    color: "white",
    marginLeft: 8,
    fontWeight: "600",
  },
});
