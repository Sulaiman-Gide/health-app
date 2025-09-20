import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import Toast from "react-native-toast-message";

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        let { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied");
          setIsLoading(false);
          return;
        }

        // Get current position
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setLocation(currentLocation);
      } catch (error) {
        console.error("Error getting location:", error);
        setErrorMsg("Error getting your location. Please try again.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleShareLocation = async () => {
    if (!location) return;

    try {
      // Get address from coordinates
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address.length > 0) {
        const locationString = `I'm at ${address[0].name || ""} ${
          address[0].street || ""
        }, ${address[0].city || ""}, ${address[0].region || ""} ${
          address[0].postalCode || ""
        }`;
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${location.coords.latitude},${location.coords.longitude}`;

        // You can implement sharing logic here
        Alert.alert(
          "Share Your Location",
          `Your location: ${locationString}\n\nMap: ${mapUrl}`,
          [
            {
              text: "Copy Location",
              onPress: async () => {
                try {
                  const locationString = `I'm at ${address[0].name || ""} ${
                    address[0].street || ""
                  }, ${address[0].city || ""}, ${address[0].region || ""} ${
                    address[0].postalCode || ""
                  }\nMap: ${mapUrl}`;
                  await Clipboard.setStringAsync(locationString);
                  Toast.show({
                    type: "success",
                    text1: "Copied!",
                    text2: "Location copied to clipboard",
                    position: "bottom",
                    visibilityTime: 2000,
                  });
                } catch (error) {
                  console.error("Error copying to clipboard:", error);
                  Toast.show({
                    type: "error",
                    text1: "Error",
                    text2: "Failed to copy to clipboard",
                    position: "bottom",
                    visibilityTime: 2000,
                  });
                }
              },
            },
            {
              text: "OK",
              style: "cancel",
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error sharing location:", error);
      Alert.alert("Error", "Failed to share location. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Loading map...</ThemedText>
      </ThemedView>
    );
  }

  if (errorMsg) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Toast />
      {location && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          followsUserLocation={true}
        >
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="Your Location"
            description="This is your current location"
          />
        </MapView>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShareLocation}
        >
          <Ionicons name="share-social" size={24} color="white" />
          <Text style={styles.shareButtonText}>Share My Location</Text>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
    width: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
  buttonContainer: {
    position: "absolute",
    top: 60,
    right: 20,
    alignItems: "center",
  },
  shareButton: {
    flexDirection: "row",
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  shareButtonText: {
    color: "white",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
  },
});
