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
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type StatsType = {
  totalUsers: number;
  activeUsers: number;
  emergencyReports: number;
  todayEmergencies: number;
};

export default function AdminDashboard() {
  const colors = Colors.light;
  const { session } = useAuthStore();
  const user = session?.user;
  const [stats, setStats] = useState<StatsType>({
    totalUsers: 0,
    activeUsers: 0,
    emergencyReports: 0,
    todayEmergencies: 0,
  });
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

      // Fetch total emergency reports
      const { count: emergencyReports } = await supabase
        .from("emergency_reports")
        .select("*", { count: "exact", head: true });

      // Fetch today's emergencies
      const { count: todayEmergencies } = await supabase
        .from("emergency_reports")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00.000Z`)
        .lte("created_at", `${today}T23:59:59.999Z`);

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        emergencyReports: emergencyReports || 0,
        todayEmergencies: todayEmergencies || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
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

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon="people"
              color="#60A5FA"
              isLoading={isLoading && !refreshing}
            />
            <StatCard
              title="Active Users"
              value={stats.activeUsers}
              icon="person"
              color="#34D399"
              isLoading={isLoading && !refreshing}
            />
            <StatCard
              title="Emergencies"
              value={stats.emergencyReports}
              icon="warning"
              color="#F87171"
              isLoading={isLoading && !refreshing}
            />
            <StatCard
              title="Today"
              value={stats.todayEmergencies}
              icon="alert-circle"
              color="#FBBF24"
              isLoading={isLoading && !refreshing}
            />
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

          {/* Recent Activity */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>
                Recent Activity
              </ThemedText>
              <View style={styles.divider} />
            </View>
            <View style={styles.recentActivity}>
              <View style={styles.activityItem}>
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: "#60A5FA20" },
                  ]}
                >
                  <Ionicons name="person-add" size={18} color="#60A5FA" />
                </View>
                <View style={styles.activityContent}>
                  <ThemedText style={styles.activityText}>
                    <ThemedText style={{ fontWeight: "600" }}>
                      5 new users
                    </ThemedText>{" "}
                    registered today
                  </ThemedText>
                  <ThemedText style={styles.activityTime}>
                    2 hours ago
                  </ThemedText>
                </View>
              </View>
              <View style={styles.activityItem}>
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: "#F8717120" },
                  ]}
                >
                  <Ionicons name="warning" size={18} color="#F87171" />
                </View>
                <View style={styles.activityContent}>
                  <ThemedText style={styles.activityText}>
                    <ThemedText style={{ fontWeight: "600" }}>
                      New emergency
                    </ThemedText>{" "}
                    reported
                  </ThemedText>
                  <ThemedText style={styles.activityTime}>
                    1 hour ago
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
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
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
    justifyContent: "center",
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
});
