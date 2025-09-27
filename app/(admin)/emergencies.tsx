import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type EmergencyReport = {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  avatar_url?: string;
  user_blood_type?: string;
  user_seasonal_allergies?: string | string[];
  user_medications?: string | string[];
  emergency_type: string;
  description: string;
  status: "pending" | "in_progress" | "resolved" | "cancelled";
  created_at: string;
  updated_at: string;
  location?: {
    latitude: number;
    longitude: number;
  } | null;
  latitude?: number;
  longitude?: number;
};

export default function EmergenciesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const [emergencies, setEmergencies] = useState<EmergencyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | EmergencyReport["status"]
  >("all");
  const fetchEmergencies = useCallback(async () => {
    try {
      setIsLoading(true);

      // Build the base query
      let query = supabase
        .from("emergency_reports")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply status filter if not 'all'
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply search query if it exists
      if (searchQuery.trim() !== "") {
        query = query.or(
          `emergency_type.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,user_name.ilike.%${searchQuery}%`
        );
      }

      const { data: reports, error: reportsError } = await query;

      if (reportsError) throw reportsError;

      // If no reports, set empty array and return
      if (!reports || reports.length === 0) {
        setEmergencies([]);
        return;
      }

      // Get all user IDs from the reports
      const userIds = reports.map((report) => report.user_id).filter(Boolean);

      console.log("User IDs from reports:", userIds);

      // Fetch all related profiles with additional fields
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url, seasonal_allergies, medications, blood_type"
        )
        .in("id", userIds);

      console.log("Fetched profiles:", profiles);

      if (profilesError) throw profilesError;

      // Create a map of user ID to profile for easy lookup
      const profileMap = new Map();
      profiles?.forEach((profile) => {
        console.log(
          "Mapping profile:",
          profile.id,
          "with name:",
          profile.full_name
        );
        profileMap.set(profile.id, profile);
      });
      console.log("Profile map size:", profileMap.size);

      // Combine the data
      const transformedData = reports.map((report) => {
        console.log(
          "Processing report:",
          report.id,
          "with user_id:",
          report.user_id
        );
        const userProfile = profileMap.get(report.user_id) || {};
        console.log(
          "Found profile for user_id",
          report.user_id,
          ":",
          userProfile
        );

        const transformed = {
          ...report,
          user_email: userProfile.full_name || "Unknown User",
          user_name: userProfile.full_name || "Unknown User",
          avatar_url: userProfile.avatar_url,
          user_seasonal_allergies: userProfile.seasonal_allergies,
          user_medications: userProfile.medications,
          user_blood_type: userProfile.blood_type,
        };

        console.log("Transformed report data:", transformed);
        return transformed;
      });

      setEmergencies(transformedData);
    } catch (error) {
      console.error("Error fetching emergency reports:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, statusFilter, router]);

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
      const normalizedStatus =
        newStatus.toLowerCase() as EmergencyReport["status"];

      const { error } = await supabase
        .from("emergency_reports")
        .update({
          status: normalizedStatus,
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
                status: normalizedStatus,
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
    <View style={[styles.emergencyCard, { backgroundColor: "#142347" }]}>
      <View style={styles.emergencyHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText
            type="subtitle"
            style={{ fontSize: 16, fontWeight: "600" }}
          >
            {item.emergency_type
              ? item.emergency_type
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())
              : "Emergency"}
          </ThemedText>
          <ThemedText style={styles.userInfo}>{item.user_name}</ThemedText>
          {item.user_blood_type && (
            <ThemedText style={styles.userDetail}>
              Blood Type: {item.user_blood_type}
            </ThemedText>
          )}
          {item.user_seasonal_allergies && (
            <ThemedText style={styles.userDetail}>
              Allergies: {item.user_seasonal_allergies}
            </ThemedText>
          )}
          {item.user_medications && (
            <ThemedText style={styles.userDetail}>
              Medications: {item.user_medications}
            </ThemedText>
          )}
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <ThemedText style={styles.metaText}>
            Reported: {formatDate(item.created_at)}
          </ThemedText>
        </View>
        {item.updated_at !== item.created_at && (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ThemedText style={styles.metaText}>
              Updated: {formatDate(item.updated_at)}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {item.status === "pending" && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#2196F320" }]}
              onPress={() => {
                // Check for location in both formats
                const latitude = item.location?.latitude ?? item.latitude;
                const longitude = item.location?.longitude ?? item.longitude;

                if (latitude === undefined || longitude === undefined) {
                  console.error(
                    "No location data available for this emergency",
                    item
                  );
                  return;
                }

                updateStatus(item.id, "in_progress");
                router.push({
                  pathname: "/map",
                  params: {
                    latitude: latitude.toString(),
                    longitude: longitude.toString(),
                    title: `Emergency: ${item.emergency_type}`,
                    description: item.description || "No additional details",
                  },
                });
              }}
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
      <ThemedView
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: "#0F172A" }]}>
      <ThemedView style={[styles.container]}>
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
            Emergencies Reports
          </ThemedText>
          <View style={styles.headerRight} />
        </View>
        <View
          style={[
            styles.searchContainer,
            {
              outlineWidth: 0,
              backgroundColor: "#121d36",
              borderColor: "#94A3B8",
              borderWidth: 1,
            },
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={"#efefef"}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search emergencies..."
            placeholderTextColor="#adb5bd"
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
              <Ionicons name="close-circle" size={20} color="#adb5bd" />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ gap: 16 }}>
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
                      statusFilter === status && styles.activeFilterText,
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
                tintColor="#4361ee"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="warning-outline" size={48} color="#adb5bd" />
                <ThemedText style={styles.emptyText}>
                  {statusFilter === "all"
                    ? "No emergency reports found"
                    : `No ${statusFilter.replace(/_/g, " ")} emergencies`}
                </ThemedText>
              </View>
            }
          />
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
    paddingBottom: 200,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
    marginRight: 24,
    color: "#F1F5F9",
  },
  backButton: {
    padding: 4,
    zIndex: 1,
  },
  headerRight: {
    width: 24,
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
    borderRadius: 12,
    backgroundColor: "white",
    paddingHorizontal: 16,
    height: 50,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 10,
    color: "#6c757d",
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#efefef",
    fontFamily: "System",
  },
  clearButton: {
    padding: 4,
  },
  filterContainer: {
    maxHeight: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    maxHeight: 52,
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dee2e6",
    marginRight: 8,
    backgroundColor: "white",
  },
  activeFilter: {
    borderWidth: 0,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6c757d",
  },
  activeFilterText: {
    color: "white",
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  emergencyCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  emergencyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  userInfo: {
    fontSize: 16,
    color: "#e2e8f0",
    marginTop: 4,
    fontWeight: "500",
  },
  userDetail: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    height: 32,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  description: {
    marginTop: 8,
    lineHeight: 20,
    color: "#212529",
    fontSize: 14,
  },
  metaContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    paddingTop: 12,
  },
  metaText: {
    fontSize: 12,
    color: "#6c757d",
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    textAlign: "center",
    color: "#6c757d",
  },
});
