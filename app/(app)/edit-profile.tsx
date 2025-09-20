import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type User = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    seasonal_allergies?: string[];
    medications?: string[];
    blood_type?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  };
};

export default function EditProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { session, updateProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [seasonalAllergies, setSeasonalAllergies] = useState("");
  const [medications, setMedications] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  useEffect(() => {
    if (session?.user) {
      setFullName(session.user.user_metadata?.full_name || "");
      setEmail(session.user.email || "");
      setSeasonalAllergies(
        session.user.user_metadata?.seasonal_allergies?.join(", ") || ""
      );
      setMedications(session.user.user_metadata?.medications?.join(", ") || "");
      setBloodType(session.user.user_metadata?.blood_type || "");
      setEmergencyContactName(
        session.user.user_metadata?.emergency_contact_name || ""
      );
      setEmergencyContactPhone(
        session.user.user_metadata?.emergency_contact_phone || ""
      );
    }
  }, [session]);

  const handleSave = async () => {
    if (!session) {
      Alert.alert("Error", "You must be logged in to update your profile");
      router.push("/(auth)/login");
      return;
    }

    try {
      setLoading(true);

      // Process allergies and medications into arrays
      const allergiesArray = seasonalAllergies
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      const medicationsArray = medications
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      const { error } = await updateProfile({
        full_name: fullName,
        seasonal_allergies: allergiesArray,
        medications: medicationsArray,
        blood_type: bloodType,
        emergency_contact_name: emergencyContactName,
        emergency_contact_phone: emergencyContactPhone,
      });

      if (error) {
        console.error("Profile update error:", error);
        throw new Error(error.message || "Failed to update profile");
      }

      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      Alert.alert("Error", `Failed to update profile: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          Edit Profile
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText style={styles.subtitle}>
              Update your personal and health information
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Personal Information
            </ThemedText>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Full Name</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={"#999"}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Blood Type</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={bloodType}
                onChangeText={setBloodType}
                placeholder="e.g., A+, O-"
                placeholderTextColor={"#999"}
              />
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Health Information
            </ThemedText>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>
                Seasonal Allergies (comma separated)
              </ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={seasonalAllergies}
                onChangeText={setSeasonalAllergies}
                placeholder="e.g., Pollen, Peanuts, Dust"
                placeholderTextColor={"#999"}
                multiline
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>
                Current Medications (comma separated)
              </ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={medications}
                onChangeText={setMedications}
                placeholder="e.g., Ibuprofen, Vitamin D, Lisinopril"
                placeholderTextColor={"#999"}
                multiline
              />
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Emergency Contact
            </ThemedText>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Contact Name</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={emergencyContactName}
                onChangeText={setEmergencyContactName}
                placeholder="Emergency contact full name"
                placeholderTextColor={"#999"}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Contact Phone Number</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={emergencyContactPhone}
                onChangeText={setEmergencyContactPhone}
                placeholder="Emergency contact phone number"
                placeholderTextColor={"#999"}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border },
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={false}
              placeholderTextColor={colors.text + "80"}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                backgroundColor: "#262625",
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 72,
              },
            ]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: colors.background,
                  opacity: 0.5,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              >
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            ) : (
              <ThemedText style={styles.saveButtonText}>
                Save Changes
              </ThemedText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  scrollView: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  section: {
    marginBottom: 20,
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D2D2D",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    color: "#E5E7EB",
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#1F2937",
    color: "#F3F4F6",
    minHeight: 48,
  },
  saveButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
