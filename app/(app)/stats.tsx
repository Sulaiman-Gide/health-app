import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  created_at: string;
}

export default function StatsScreen() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuthStore();
  const router = useRouter();

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", session?.user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      Alert.alert("Error", "Failed to load emergency contacts");
    } finally {
      setLoading(false);
    }
  };

  // Fetch contacts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchContacts();
    }, [session])
  );

  // Initial fetch
  useEffect(() => {
    fetchContacts();
  }, [session]);

  const handleAddContact = () => {
    router.push("/(app)/add-emergency-contact");
  };

  const handleDeleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from("emergency_contacts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchContacts();
    } catch (error) {
      console.error("Error deleting contact:", error);
      Alert.alert("Error", "Failed to delete contact");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#151718" }}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={{ fontSize: 26, fontWeight: "bold" }}>
            Emergency Contacts
          </ThemedText>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={[styles.centered, { marginTop: 200 }]}>
              <ThemedText>Loading...</ThemedText>
            </View>
          ) : contacts.length === 0 ? (
            <View style={[styles.centered, { marginTop: 200 }]}>
              <Ionicons
                name="alert-circle-outline"
                size={48}
                color="#6B7280"
                style={styles.emptyIcon}
              />
              <ThemedText style={styles.emptyText}>
                No emergency contacts found
              </ThemedText>
              <TouchableOpacity
                style={styles.addContactButton}
                onPress={handleAddContact}
              >
                <ThemedText style={styles.addContactButtonText}>
                  Add Your First Contact
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.contactsList}>
              {contacts.map((contact) => (
                <View key={contact.id} style={styles.contactCard}>
                  <View style={styles.contactInfo}>
                    <ThemedText style={styles.contactName}>
                      {contact.name}
                    </ThemedText>
                    <ThemedText style={styles.contactRelationship}>
                      {contact.relationship}
                    </ThemedText>
                    <ThemedText style={styles.contactPhone}>
                      {contact.phone}
                    </ThemedText>
                  </View>
                  <View style={styles.contactActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() =>
                        router.push(
                          `/(app)/edit-emergency-contact?id=${contact.id}`
                        )
                      }
                    >
                      <Image
                        source={require("../../assets/images/edit.png")}
                        style={{ width: 20, height: 20, objectFit: "contain" }}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteContact(contact.id)}
                    >
                      <Ionicons name="trash" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: "#151718",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 20,
    paddingBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  addButtonText: {
    fontSize: 16,
    color: "#3B82F6",
    marginLeft: 4,
    fontWeight: "600",
  },

  // Empty State
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    color: "#6B7280",
    marginBottom: 16,
    textAlign: "center",
  },
  addContactButton: {
    backgroundColor: "#1E40AF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addContactButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // Contacts List
  contactsList: {
    padding: 16,
  },
  contactCard: {
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  contactRelationship: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 16,
    color: "#60A5FA",
    fontWeight: "500",
  },
  contactActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteButton: {
    marginLeft: 4,
  },

  // Stats Section
  statsSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 16,
    color: "#F9FAFB",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statsCard: {
    width: "48%",
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  statsValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  chartPlaceholder: {
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    height: 200,
  },
});
