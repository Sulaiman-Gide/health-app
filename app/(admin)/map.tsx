import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

const { width, height } = Dimensions.get("window");

const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export default function EmergencyMapScreen() {
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();

  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Parse coordinates from params or use default
  const latitude = params.latitude
    ? parseFloat(params.latitude as string)
    : null;
  const longitude = params.longitude
    ? parseFloat(params.longitude as string)
    : null;
  const title = params.title || "Emergency Location";
  const description = params.description || "No additional details";

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);

        // If we have coordinates from params, use those
        if (latitude && longitude) {
          setLocation({
            coords: {
              latitude,
              longitude,
              altitude: null,
              accuracy: 10, // Default accuracy
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          });
          return;
        }

        // Otherwise, get the user's current location
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied");
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      } catch (error) {
        console.error("Error getting location:", error);
        setErrorMsg("Could not determine location");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [latitude, longitude]);

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={styles.loadingText}>Loading map...</ThemedText>
      </ThemedView>
    );
  }

  if (errorMsg) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="warning" size={48} color={colors.tint} />
        <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.tint }]}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.retryButtonText}>Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  if (!location) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="location" size={48} color={colors.tint} />
        <ThemedText style={styles.errorText}>Location not available</ThemedText>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.tint }]}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.retryButtonText}>Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <ThemedText
            type="subtitle"
            style={styles.headerTitle}
            numberOfLines={1}
          >
            {title}
          </ThemedText>
          <ThemedText style={styles.headerSubtitle} numberOfLines={1}>
            {description}
          </ThemedText>
        </View>
      </View>

      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        followsUserLocation={false}
        showsCompass={true}
        zoomEnabled={true}
        zoomControlEnabled={true}
        rotateEnabled={true}
        scrollEnabled={true}
        pitchEnabled={true}
        toolbarEnabled={true}
      >
        <Marker
          coordinate={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          title={title as string}
          description={description as string}
        >
          <View style={[styles.marker, { backgroundColor: colors.tint }]}>
            <Ionicons name="warning" size={24} color="white" />
          </View>
        </Marker>
      </MapView>

      <View style={styles.coordinatesContainer}>
        <ThemedText style={styles.coordinatesText}>
          {location.coords.latitude.toFixed(6)},{" "}
          {location.coords.longitude.toFixed(6)}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.tint }]}
          onPress={() => {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${location.coords.latitude},${location.coords.longitude}`;
            Linking.openURL(url);
          }}
        >
          <Ionicons name="navigate" size={20} color="white" />
          <ThemedText style={styles.actionButtonText}>Directions</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.tint }]}
          onPress={() => {
            const url = `https://www.google.com/maps/search/?api=1&query=${location.coords.latitude},${location.coords.longitude}`;
            Linking.openURL(url);
          }}
        >
          <Ionicons name="map" size={20} color="white" />
          <ThemedText style={styles.actionButtonText}>Open in Maps</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 16,
    opacity: 0.8,
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: "600",
  },
  headerSubtitle: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  map: {
    width: "100%",
    height: "70%",
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  coordinatesContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  coordinatesText: {
    fontSize: 12,
    opacity: 0.7,
    fontFamily: "monospace",
  },
  actions: {
    flexDirection: "row",
    padding: 16,
    justifyContent: "space-around",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  actionButtonText: {
    color: "white",
    marginLeft: 8,
    fontWeight: "500",
  },
});
