import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type StatsType = {
  totalUsers: number;
  activeUsers: number;
  emergencyReports: number;
  todayEmergencies: number;
  allEmergencies: number;
};

// Helper function to format time ago
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `${interval} year${interval === 1 ? "" : "s"} ago`;

  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `${interval} month${interval === 1 ? "" : "s"} ago`;

  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval} day${interval === 1 ? "" : "s"} ago`;

  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval} hour${interval === 1 ? "" : "s"} ago`;

  interval = Math.floor(seconds / 60);
  if (interval >= 1)
    return `${interval} minute${interval === 1 ? "" : "s"} ago`;

  return "Just now";
};

// Helper function to get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "#FFA000";
    case "in_progress":
      return "#2196F3";
    case "resolved":
      return "#4CAF50";
    case "cancelled":
      return "#F44336";
    default:
      return "#9E9E9E";
  }
};

export default function AdminDashboard() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme || "light"];
  const { session, signOut } = useAuthStore();
  const user = session?.user;

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/(auth)/login");
    } catch (error) {
      console.log("Error logging out:", error);
    }
  };
  const [stats, setStats] = useState<StatsType>({
    totalUsers: 0,
    activeUsers: 0,
    emergencyReports: 0,
    todayEmergencies: 0,
    allEmergencies: 0,
  });
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);

      // Get today's date in ISO format
      const today = new Date().toISOString().split("T")[0];

      // Fetch total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch active users (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: activeUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gt("last_sign_in_at", thirtyDaysAgo.toISOString());

      // Fetch active emergencies (pending + in_progress)
      const { count: activeEmergencies } = await supabase
        .from("emergency_reports")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "in_progress"]);

      const { count: allEmergencies } = await supabase
        .from("emergency_reports")
        .select("*", { count: "exact", head: true });

      // Fetch today's emergencies
      const { count: todayEmergencies } = await supabase
        .from("emergency_reports")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00.000Z`)
        .lt("created_at", `${today}T23:59:59.999Z`);

      // Fetch recent emergencies for activity feed
      const { data: recentEmergencies } = await supabase
        .from("emergency_reports")
        .select(
          `
          *,
          profiles:user_id (id, full_name)
        `
        )
        .order("updated_at", { ascending: false })
        .limit(5);

      setEmergencies(
        recentEmergencies?.map((emergency) => ({
          ...emergency,
          user_name: emergency.profiles?.full_name || "Unknown User",
        })) || []
      );

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0, // Active users (last 30 days)
        emergencyReports: activeEmergencies || 0, // Active emergencies (pending + in_progress)
        todayEmergencies: todayEmergencies || 0, // Emergencies reported today
        allEmergencies: allEmergencies || 0, // All emergencies regardless of status
      });
    } catch (error) {
      console.log("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon,
    color,
    isLoading = false,
  }: {
    title: string;
    value: number;
    icon: string;
    color: string;
    isLoading?: boolean;
  }) => (
    <View style={styles.statCard}>
      <View style={styles.statContent}>
        <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <ThemedText style={styles.statValue}>
          {isLoading ? "--" : value.toLocaleString()}
        </ThemedText>
        <ThemedText style={styles.statTitle}>{title}</ThemedText>
      </View>
    </View>
  );

  const QuickAction = ({
    title,
    icon,
    description,
    onPress,
    color,
  }: {
    title: string;
    icon: string;
    description?: string;
    onPress: () => void;
    color: string;
  }) => (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View>
        <ThemedText style={styles.actionText}>{title}</ThemedText>
        {description && (
          <ThemedText style={styles.actionDescription}>
            {description}
          </ThemedText>
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color="#64748B"
        style={{ marginLeft: "auto", alignSelf: "center" }}
      />
    </TouchableOpacity>
  );

  if (isLoading && !refreshing) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F172A" }}>
      <StatusBar style="light" />
      <ThemedView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#60A5FA"
              colors={["#60A5FA"]}
            />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View>
              <ThemedText type="title" style={styles.headerTitle}>
                Dashboard
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                Welcome back,{" "}
                <ThemedText style={{ fontWeight: "600" }}>
                  {session?.user?.email?.split("@")[0] || "Admin"}
                </ThemedText>
              </ThemedText>
            </View>
            <View style={styles.headerActions}>
              <View style={styles.lastUpdated}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color="#94A3B8"
                  style={styles.clockIcon}
                />
                <ThemedText style={styles.lastUpdatedText}>
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatCard
                title="Active Emergencies"
                value={stats.emergencyReports}
                icon="warning"
                color="#F59E0B"
                isLoading={isLoading}
              />
              <StatCard
                title="All Emergencies"
                value={stats.allEmergencies}
                icon="list"
                color="#4F46E5"
                isLoading={isLoading}
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                title="Total Users"
                value={stats.totalUsers}
                icon="people"
                color="#10B981"
                isLoading={isLoading}
              />
              <StatCard
                title="Today's Emergencies"
                value={stats.todayEmergencies}
                icon="today"
                color="#EC4899"
                isLoading={isLoading}
              />
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
              <View style={styles.divider} />
            </View>
            <View style={styles.quickActions}>
              <QuickAction
                title="View Users"
                icon="people"
                description="Manage user accounts and permissions"
                onPress={() => router.push("/(admin)/users")}
                color="#60A5FA"
              />
              <QuickAction
                title="Emergencies"
                icon="warning"
                description="View and manage emergency reports"
                onPress={() => router.push("/(admin)/emergencies")}
                color="#F87171"
              />
            </View>
          </View>

          <View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color="#F87171" />
              <ThemedText style={styles.logoutText}>Logout</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Recent Activity */}
          {/** <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>
                Recent Activity
              </ThemedText>
              <View style={styles.divider} />
            </View>
            <View style={styles.recentActivity}>
              {emergencies.length > 0 ? (
                emergencies
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                  .slice(0, 5)
                  .map((emergency, index) => (
                    <View key={`${emergency.id}-${index}`} style={styles.activityItem}>
                      <View
                        style={[
                          styles.activityIcon,
                          { 
                            backgroundColor: getStatusColor(emergency.status) + '20',
                            borderColor: getStatusColor(emergency.status),
                            borderWidth: 1
                          },
                        ]}
                      >
                        <Ionicons 
                          name={
                            emergency.status === 'resolved' ? 'checkmark-circle' :
                            emergency.status === 'cancelled' ? 'close-circle' :
                            emergency.status === 'in_progress' ? 'time' : 'warning'
                          } 
                          size={18} 
                          color={getStatusColor(emergency.status)} 
                        />
                      </View>
                      <View style={styles.activityContent}>
                        <ThemedText style={styles.activityText}>
                          <ThemedText style={{ fontWeight: "600" }}>
                            {emergency.emergency_type.replace(/_/g, ' ')}
                            {emergency.status === 'resolved' ? ' resolved' :
                             emergency.status === 'cancelled' ? ' cancelled' :
                             emergency.status === 'in_progress' ? ' in progress' : ' reported'}
                          </ThemedText>
                          {emergency.user_name && (
                            <ThemedText> by {emergency.user_name}</ThemedText>
                          )}
                        </ThemedText>
                        <ThemedText style={styles.activityTime}>
                          {formatTimeAgo(emergency.updated_at)}
                        </ThemedText>
                      </View>
                    </View>
                  ))
              ) : (
                <View style={styles.noActivityContainer}>
                  <Ionicons name="time-outline" size={32} color="#94a3b8" />
                  <ThemedText style={styles.noActivityText}>
                    No recent activities
                  </ThemedText>
                </View>
              )}
            </View>
          </View> **/}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  statContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
    color: "#efefef",
  },
  subtitle: {
    fontSize: 15,
    color: "#94A3B8",
    marginTop: 2,
  },
  lastUpdated: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121d36",
    borderColor: "#94A3B8",
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  clockIcon: {
    marginRight: 4,
  },
  lastUpdatedText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  headerActions: {
    alignItems: "flex-end",
    gap: 12,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  logoutText: {
    color: "#F87171",
    fontSize: 16,
    fontWeight: "500",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginTop: 8,
  },
  statCard: {
    width: "50%",
    padding: 8,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 4,
    marginLeft: 6,
  },
  statTitle: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
    marginLeft: 6,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  quickAction: {
    width: "100%",
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  actionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
  },
  recentActivity: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  activityItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  noActivityContainer: {
    alignItems: "center",
    padding: 20,
  },
  noActivityText: {
    color: "#94a3b8",
    marginTop: 8,
  },
  activityText: {
    fontSize: 14,
    color: "#E2E8F0",
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: "#64748B",
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
});
