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
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_active: boolean;
};

export default function UsersScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { session } = useAuthStore();
  const currentUser = session?.user;

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      // First, get the current user's session
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError) throw sessionError;
      if (!user) throw new Error('No user session found');

      // Call a PostgreSQL function to get users with their emails
      const { data: usersWithEmails, error: rpcError } = await supabase
        .rpc('get_users_with_emails')
        .order('created_at', { ascending: false });

      if (rpcError) throw rpcError;

      // Filter by search query if provided
      const filteredUsers = searchQuery
        ? usersWithEmails.filter((user: User) =>
            user.email?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : usersWithEmails;

      setUsers(filteredUsers || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !currentStatus })
        .eq("id", userId);

      if (error) throw error;

      // Update local state
      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, is_active: !currentStatus } : user
        )
      );
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={[styles.userCard, { backgroundColor: colors.card }]}>
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
            <Ionicons name="calendar-outline" size={14} color={colors.text} />{" "}
            Joined: {new Date(item.created_at).toLocaleDateString()}
          </ThemedText>
          <ThemedText style={styles.metaText}>
            <Ionicons name="time-outline" size={14} color={colors.text} /> Last
            login: {formatDate(item.last_sign_in_at)}
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
          onPress={() => toggleUserStatus(item.id, item.is_active)}
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
            <Ionicons name="arrow-back" size={24} color={colors.text} />
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
          <Ionicons
            name="search"
            size={20}
            color={colors.text}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search users..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
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
          data={users}
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
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  userCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
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
    flex: 1,
    marginRight: 8,
  },
  userName: {
    opacity: 0.8,
    marginBottom: 8,
  },
  userMeta: {
    marginTop: 8,
  },
  metaText: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 12,
    color: "white",
    fontWeight: "600",
  },
  toggleButton: {
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  toggleButtonText: {
    fontWeight: "600",
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
    opacity: 0.7,
    textAlign: "center",
  },
});
