import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AddEmergencyContact() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [loading, setLoading] = useState(false);
  const { session } = useAuthStore();
  const router = useRouter();

  const handleAddContact = async () => {
    if (!name.trim() || !phone.trim() || !relationship.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from("emergency_contacts").insert([
        {
          user_id: session?.user?.id,
          name: name.trim(),
          phone: phone.trim(),
          relationship: relationship.trim(),
        },
      ]);

      if (error) throw error;

      Alert.alert("Success", "Emergency contact added successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      //console.error("Error adding contact:", error);
      Alert.alert("Error", "Failed to add emergency contact");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#151718" }}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#3B82F6" />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            Add Emergency Contact
          </ThemedText>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Full Name</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#6B7280"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Phone Number</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="+1234567890"
                placeholderTextColor="#6B7280"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Relationship</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="e.g., Spouse, Parent, Friend"
                placeholderTextColor="#6B7280"
                value={relationship}
                onChangeText={setRelationship}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleAddContact}
              disabled={loading}
            >
              <ThemedText style={styles.saveButtonText}>
                {loading ? "Saving..." : "Save Contact"}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#151718",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#1F2937",
    borderRadius: 8,
    padding: 14,
    color: "#F9FAFB",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#374151",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
