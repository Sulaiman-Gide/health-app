import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/store/auth";
import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [isEmailSent, setIsEmailSent] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { resetPassword, isLoading, error } = useAuthStore();

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error);
    }
  }, [error]);

  const validate = () => {
    const newErrors: { email?: string } = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;

    const { error } = await resetPassword(email);

    if (!error) {
      setIsEmailSent(true);
    }
  };

  if (isEmailSent) {
    return (
      <ThemedView style={styles.successContainer}>
        <ThemedText type="title" style={styles.title}>
          Check Your Email
        </ThemedText>
        <ThemedText style={styles.successText}>
          We've sent you an email with instructions to reset your password.
        </ThemedText>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.buttonText}>Back to Login</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ThemedView style={styles.innerContainer}>
        <ThemedText type="title" style={styles.title}>
          Reset Password
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password.
        </ThemedText>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Email"
              placeholderTextColor={colors.placeholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: "#262625",
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            <ThemedText style={styles.buttonText}>
              {isLoading ? "Sending..." : "Send Reset Link"}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Remember your password?{" "}
            </ThemedText>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <ThemedText style={[styles.footerLink, { color: colors.tint }]}>
                  Sign in
                </ThemedText>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  successContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 48,
    textAlign: "center",
    opacity: 0.7,
  },
  successText: {
    fontSize: 16,
    marginBottom: 48,
    textAlign: "center",
    opacity: 0.8,
    lineHeight: 24,
  },
  form: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    width: "100%",
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  button: {
    width: "100%",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});
