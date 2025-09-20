import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export default function EditEmergencyContact() {
  const { id } = useLocalSearchParams();
  const [contact, setContact] = useState<EmergencyContact>({
    id: "",
    name: "",
    phone: "",
    relationship: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { session } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const fetchContact = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("emergency_contacts")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        if (data) setContact(data);
      } catch (error) {
        //console.error("Error fetching contact:", error);
        Alert.alert("Error", "Failed to load contact details");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchContact();
    }
  }, [id]);

  const handleUpdateContact = async () => {
    if (
      !contact.name.trim() ||
      !contact.phone.trim() ||
      !contact.relationship.trim()
    ) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from("emergency_contacts")
        .update({
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          relationship: contact.relationship.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", contact.id);

      if (error) throw error;

      Alert.alert("Success", "Contact updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      //console.error("Error updating contact:", error);
      Alert.alert("Error", "Failed to update contact");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async () => {
    Alert.alert(
      "Delete Contact",
      "Are you sure you want to delete this contact?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("emergency_contacts")
                .delete()
                .eq("id", contact.id);

              if (error) throw error;

              Alert.alert("Success", "Contact deleted successfully", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (error) {
              //console.error("Error deleting contact:", error);
              Alert.alert("Error", "Failed to delete contact");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#151718" }}>
        <ThemedView style={[styles.container, styles.centered]}>
          <ThemedText>Loading...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

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
            Edit Contact
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
                value={contact.name}
                onChangeText={(text) => setContact({ ...contact, name: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Phone Number</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="+1234567890"
                placeholderTextColor="#6B7280"
                keyboardType="phone-pad"
                value={contact.phone}
                onChangeText={(text) => setContact({ ...contact, phone: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Relationship</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="e.g., Spouse, Parent, Friend"
                placeholderTextColor="#6B7280"
                value={contact.relationship}
                onChangeText={(text) =>
                  setContact({ ...contact, relationship: text })
                }
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleUpdateContact}
              disabled={saving}
            >
              <ThemedText style={styles.saveButtonText}>
                {saving ? "Saving..." : "Save Changes"}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteContact}
              disabled={saving}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <ThemedText style={styles.deleteButtonText}>
                Delete Contact
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
  centered: {
    justifyContent: "center",
    alignItems: "center",
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
    marginBottom: 12,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  deleteButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
