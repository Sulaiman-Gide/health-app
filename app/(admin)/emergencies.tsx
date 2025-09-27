import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

type EmergencyReport = {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  emergency_type: string;
  description: string;
  status: "pending" | "in_progress" | "resolved" | "cancelled";
  created_at: string;
  updated_at: string;
  location: {
    latitude: number;
    longitude: number;
  } | null;
};

export default function EmergenciesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [emergencies, setEmergencies] = useState<EmergencyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | EmergencyReport["status"]
  >("all");
  const router = useRouter();

  const fetchEmergencies = async () => {
    try {
      setIsLoading(true);

      let query = supabase
        .from("emergency_reports")
        .select(
          `
          *,
          profiles:user_id (email, full_name)
        `
        )
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.or(
          `description.ilike.%${searchQuery}%,emergency_type.ilike.%${searchQuery}%`
        );
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to include user details
      const transformedData = data.map((report: any) => ({
        ...report,
        user_email: report.profiles?.email || "Unknown",
        user_name: report.profiles?.full_name || "Unknown User",
      }));

      setEmergencies(transformedData);
    } catch (error) {
      console.error("Error fetching emergency reports:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmergencies();
  }, [statusFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmergencies();
  };

  const updateStatus = async (
    id: string,
    newStatus: EmergencyReport["status"]
  ) => {
    try {
      const { error } = await supabase
        .from("emergency_reports")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setEmergencies(
        emergencies.map((emergency) =>
          emergency.id === id
            ? {
                ...emergency,
                status: newStatus,
                updated_at: new Date().toISOString(),
              }
            : emergency
        )
      );
    } catch (error) {
      console.error("Error updating emergency status:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#FFA000"; // Amber
      case "in_progress":
        return "#2196F3"; // Blue
      case "resolved":
        return "#4CAF50"; // Green
      case "cancelled":
        return "#F44336"; // Red
      default:
        return "#9E9E9E"; // Grey
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderEmergencyItem = ({ item }: { item: EmergencyReport }) => (
    <View style={[styles.emergencyCard, { backgroundColor: colors.card }]}>
      <View style={styles.emergencyHeader}>
        <View>
          <ThemedText type="subtitle">
            {item.emergency_type
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase())}
          </ThemedText>
          <ThemedText style={styles.userInfo}>
            Reported by: {item.user_name} ({item.user_email})
          </ThemedText>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(item.status)}20` },
          ]}
        >
          <ThemedText
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase())}
          </ThemedText>
        </View>
      </View>

      {item.description && (
        <ThemedText style={styles.description}>{item.description}</ThemedText>
      )}

      <View style={styles.metaContainer}>
        <ThemedText style={styles.metaText}>
          <Ionicons name="time-outline" size={14} color={colors.text} />{" "}
          Reported: {formatDate(item.created_at)}
        </ThemedText>
        {item.updated_at !== item.created_at && (
          <ThemedText style={styles.metaText}>
            <Ionicons name="refresh-outline" size={14} color={colors.text} />{" "}
            Updated: {formatDate(item.updated_at)}
          </ThemedText>
        )}
      </View>

      <View style={styles.actions}>
        {item.status === "pending" && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#2196F320" }]}
              onPress={() => updateStatus(item.id, "in_progress")}
            >
              <Ionicons name="play" size={16} color="#2196F3" />
              <ThemedText style={[styles.actionText, { color: "#2196F3" }]}>
                Start
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#4CAF5020" }]}
              onPress={() => updateStatus(item.id, "resolved")}
            >
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <ThemedText style={[styles.actionText, { color: "#4CAF50" }]}>
                Resolve
              </ThemedText>
            </TouchableOpacity>
          </>
        )}

        {item.status === "in_progress" && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#4CAF5020" }]}
              onPress={() => updateStatus(item.id, "resolved")}
            >
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <ThemedText style={[styles.actionText, { color: "#4CAF50" }]}>
                Resolve
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#FFA00020" }]}
              onPress={() => updateStatus(item.id, "pending")}
            >
              <Ionicons name="pause" size={16} color="#FFA000" />
              <ThemedText style={[styles.actionText, { color: "#FFA000" }]}>
                Pause
              </ThemedText>
            </TouchableOpacity>
          </>
        )}

        {item.status !== "cancelled" && item.status !== "resolved" && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#F4433620" }]}
            onPress={() => updateStatus(item.id, "cancelled")}
          >
            <Ionicons name="close-circle" size={16} color="#F44336" />
            <ThemedText style={[styles.actionText, { color: "#F44336" }]}>
              {item.status === "pending" ? "Cancel" : "Cancel"}
            </ThemedText>
          </TouchableOpacity>
        )}

        {item.status === "resolved" && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#2196F320" }]}
            onPress={() => updateStatus(item.id, "in_progress")}
          >
            <Ionicons name="refresh" size={16} color="#2196F3" />
            <ThemedText style={[styles.actionText, { color: "#2196F3" }]}>
              Reopen
            </ThemedText>
          </TouchableOpacity>
        )}

        {item.location && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#9C27B020" }]}
            onPress={() => {
              // Navigate to map with location
              router.push({
                pathname: "/(admin)/map",
                params: {
                  latitude: item.location?.latitude,
                  longitude: item.location?.longitude,
                  title: `Emergency: ${item.emergency_type}`,
                  description: item.description || "No additional details",
                },
              });
            }}
          >
            <Ionicons name="location" size={16} color="#9C27B0" />
            <ThemedText style={[styles.actionText, { color: "#9C27B0" }]}>
              View Location
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons
          name="search"
          size={20}
          color={colors.text}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search emergencies..."
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={fetchEmergencies}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery("");
              fetchEmergencies();
            }}
            style={styles.clearButton}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={colors.placeholder}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {["all", "pending", "in_progress", "resolved", "cancelled"].map(
          (status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                statusFilter === status && {
                  backgroundColor: getStatusColor(status),
                  borderColor: getStatusColor(status),
                },
                statusFilter === status && styles.activeFilter,
              ]}
              onPress={() => setStatusFilter(status as any)}
            >
              <ThemedText
                style={[
                  styles.filterText,
                  statusFilter === status && { color: "white" },
                ]}
              >
                {status
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </ThemedText>
            </TouchableOpacity>
          )
        )}
      </ScrollView>

      <FlatList
        data={emergencies}
        renderItem={renderEmergencyItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
          />
        }
        ListEmptyComponent={
          <ThemedView style={styles.emptyContainer}>
            <Ionicons
              name="warning-outline"
              size={48}
              color={colors.placeholder}
            />
            <ThemedText style={styles.emptyText}>
              {statusFilter === "all"
                ? "No emergency reports found"
                : `No ${statusFilter.replace(/_/g, " ")} emergencies`}
            </ThemedText>
          </ThemedView>
        }
      />
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
    opacity: 0.7,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginRight: 8,
    backgroundColor: "transparent",
  },
  activeFilter: {
    borderWidth: 0,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  emergencyCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  emergencyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  userInfo: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  description: {
    marginTop: 8,
    lineHeight: 20,
  },
  metaContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: 12,
  },
  metaText: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    marginHorizontal: -4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    margin: 4,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    opacity: 0.7,
    textAlign: "center",
  },
});
