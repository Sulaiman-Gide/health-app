import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrivacyScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

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
          Privacy Policy
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ThemedView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <ThemedText style={styles.paragraph}>
            Your privacy is important to us. This Privacy Policy explains how we
            collect, use, disclose, and safeguard your information when you use
            our Health App.
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Information We Collect
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            We may collect personal information that you voluntarily provide to
            us when you register with the App, express an interest in obtaining
            information about us or our products and services, or otherwise when
            you contact us.
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            How We Use Your Information
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            We use the information we collect or receive to provide you with the
            services you request, to improve our services, and to communicate
            with you.
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
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 12,
    lineHeight: 22,
  },
});
