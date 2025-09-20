import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AboutScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const openLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          About
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText style={styles.version}>Version 1.0.0</ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Our Mission</ThemedText>
            <ThemedText style={styles.sectionText}>
              Our mission is to help you achieve your health and wellness goals
              by providing intuitive tools to track your daily activities, water
              intake, and sleep patterns.
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Features</ThemedText>

            <View style={styles.featureItem}>
              <ThemedText style={styles.featureDot}>•</ThemedText>
              <ThemedText style={styles.featureText}>
                Advice you on your health
              </ThemedText>
            </View>
            <View style={styles.featureItem}>
              <ThemedText style={styles.featureDot}>•</ThemedText>
              <ThemedText style={styles.featureText}>
                Manage emergency contacts
              </ThemedText>
            </View>
            <View style={styles.featureItem}>
              <ThemedText style={styles.featureDot}>•</ThemedText>
              <ThemedText style={styles.featureText}>
                Track your location to send emergency braodcast
              </ThemedText>
            </View>
            <View style={styles.featureItem}>
              <ThemedText style={styles.featureDot}>•</ThemedText>
              <ThemedText style={styles.featureText}>
                Recieve emergency broadcast (For hospitals and healthcare
                services)
              </ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Contact Us</ThemedText>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => openLink("mailto:support@healthapp.com")}
            >
              <ThemedText style={[styles.linkText, { color: colors.tint }]}>
                support@healthapp.com
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => openLink("https://healthapp.com")}
            >
              <ThemedText style={[styles.linkText, { color: colors.tint }]}>
                healthapp.com
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Legal</ThemedText>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push("/(app)/privacy")}
            >
              <ThemedText style={[styles.linkText, { color: colors.tint }]}>
                Privacy Policy
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push("/(app)/terms")}
            >
              <ThemedText style={[styles.linkText, { color: colors.tint }]}>
                Terms of Service
              </ThemedText>
            </TouchableOpacity>
          </View>

          <ThemedText style={styles.copyright}>
            © {new Date().getFullYear()} Health App. All rights reserved.
          </ThemedText>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  scrollView: {
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  version: {
    marginTop: 5,
    opacity: 0.7,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 15,
  },
  sectionText: {
    lineHeight: 22,
    marginBottom: 10,
  },
  featureItem: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start",
  },
  featureDot: {
    marginRight: 10,
    lineHeight: 22,
  },
  featureText: {
    flex: 1,
    lineHeight: 22,
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 16,
  },
  copyright: {
    textAlign: "center",
    marginTop: 10,
    marginBottom: 45,
    opacity: 0.7,
  },
});
