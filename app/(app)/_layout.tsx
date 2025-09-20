import { HapticTab } from "@/components/haptic-tab";
import { getThemeColors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Tabs } from "expo-router";
import React from "react";
import { Image, StyleSheet, View } from "react-native";

const TabBarIcon = ({
  focused,
  source,
  size = 28,
}: {
  focused: boolean;
  source: any;
  size?: number;
}) => (
  <View style={styles.tabIconContainer}>
    <View style={[styles.iconWrapper]}>
      <Image
        source={source}
        style={[
          styles.tabIcon,
          {
            width: size,
            height: size,
          },
        ]}
        resizeMode="contain"
      />
    </View>
  </View>
);

export default function AppLayout() {
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: "#1E293B80",
          position: "absolute",
          left: 20,
          right: 20,
          bottom: 40,
          height: 80,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.05)",
          overflow: "hidden",
          marginHorizontal: 15,
          paddingTop: 8,
          paddingHorizontal: 8,
        },
        tabBarItemStyle: {
          height: 80,
          padding: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginTop: 12,
          marginBottom: 4,
        },
        tabBarInactiveTintColor: "#9CA3AF",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              source={require("@/assets/images/home.png")}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Emergency Phone",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              source={require("@/assets/images/heart.png")}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="map-screen"
        options={{
          title: "Map",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              source={require("@/assets/images/map.png")}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              source={require("@/assets/images/profile.png")}
              size={24}
            />
          ),
        }}
      />
      {/* Hidden screens */}
      <Tabs.Screen
        name="add-emergency-contact"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="edit-emergency-contact"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="privacy"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    position: "relative",
    paddingTop: 8,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconWrapperFocused: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  tabIcon: {
    width: 24,
    height: 24,
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3B82F6",
  },
});
