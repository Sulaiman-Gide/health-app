import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type User = {
  id: string;
  email?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string | null;
};

export default function UsersScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { session } = useAuthStore();
  const currentUser = session?.user;

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      const { data: users, error } = await supabase.rpc(
        "get_users_with_profiles"
      );

      if (error) throw error;

      setAllUsers(users || []);
      setDisplayedUsers(users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setDisplayedUsers(allUsers);
      return;
    }

    const filtered = allUsers.filter((user) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        user.email?.toLowerCase().includes(searchLower) ||
        user.full_name?.toLowerCase().includes(searchLower) ||
        user.id.toLowerCase().includes(searchLower)
      );
    });

    setDisplayedUsers(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
  };

  const toggleUserStatus = async (
    userId: string,
    currentStatus: boolean | undefined
  ) => {
    // If currentStatus is undefined, default to false (inactive)
    const newStatus = currentStatus === undefined ? true : !currentStatus;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      // Update local state
      const updatedUsers = allUsers.map((user) =>
        user.id === userId ? { ...user, is_active: newStatus } : user
      );

      setAllUsers(updatedUsers);
      setDisplayedUsers(updatedUsers);
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Never";
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown";
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={[styles.userCard, { backgroundColor: "#142347" }]}>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <ThemedText type="subtitle" style={styles.userEmail}>
            {item.email}
            {item.id === currentUser?.id && " (You)"}
          </ThemedText>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: item.is_active ? "#4CAF50" : "#F44336",
                opacity: item.is_active ? 1 : 0.5,
              },
            ]}
          >
            <ThemedText style={styles.statusText}>
              {item.is_active ? "Active" : "Inactive"}
            </ThemedText>
          </View>
        </View>

        {item.full_name && (
          <ThemedText style={styles.userName}>{item.full_name}</ThemedText>
        )}
        <View style={styles.userMeta}>
          <ThemedText style={styles.metaText}>
            <Ionicons name="calendar-outline" size={14} color={"#efefef"} />{" "}
            Registered:{" "}
            {new Intl.DateTimeFormat("default", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }).format(new Date(item.created_at))}
          </ThemedText>
          <ThemedText style={styles.metaText}>
            <Ionicons name="time-outline" size={14} color={"#efefef"} /> Last
            login:{" "}
            {item.last_sign_in_at
              ? new Intl.DateTimeFormat("default", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                }).format(new Date(item.last_sign_in_at))
              : "Never"}
          </ThemedText>
        </View>
      </View>

      {item.id !== currentUser?.id && (
        <TouchableOpacity
          style={[
            styles.toggleButton,
            {
              backgroundColor: item.is_active ? "#F4433620" : "#4CAF5020",
              borderColor: item.is_active ? "#F44336" : "#4CAF50",
            },
          ]}
          onPress={() => toggleUserStatus(item.id, item.is_active ?? false)}
          disabled={isLoading}
        >
          <ThemedText
            style={[
              styles.toggleButtonText,
              { color: item.is_active ? "#F44336" : "#4CAF50" },
            ]}
          >
            {item.is_active ? "Deactivate" : "Activate"}
          </ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  const router = useRouter();

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
            Users
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
          <TouchableOpacity onPress={handleSearch}>
            <Ionicons
              name="search"
              size={20}
              color={"#efefef"}
              style={styles.searchIcon}
            />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setDisplayedUsers(allUsers);
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

        <FlatList
          data={displayedUsers}
          renderItem={renderUserItem}
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
                name="people-outline"
                size={52}
                color={colors.placeholder}
              />
              <ThemedText style={styles.emptyText}>No users found</ThemedText>
            </ThemedView>
          }
        />
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
    padding: 16,
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

    marginHorizontal: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  searchIcon: {
    marginRight: 8,
    opacity: 0.7,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#efefef",
  },
  clearButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  userCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  userEmail: {
    color: "#F1F5F9",
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 4,
    flex: 1,
    marginRight: 8,
  },
  userName: {
    color: "#94A3B8",
    fontSize: 14,
    marginBottom: 8,
  },
  userMeta: {
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  statusText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
  },
  metaText: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 4,
  },
  toggleButton: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  toggleButtonText: {
    fontWeight: "600",
    color: "#F1F5F9",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 150,
    padding: 40,
    backgroundColor: "#0F172A",
  },
  emptyText: {
    marginTop: 16,
    color: "#94A3B8",
    textAlign: "center",
    opacity: 0.7,
  },
});
