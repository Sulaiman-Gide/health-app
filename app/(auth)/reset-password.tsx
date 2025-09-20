import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const validate = () => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setIsSuccess(true);

      // Redirect to login after a short delay
      setTimeout(() => {
        router.replace("/(auth)/login");
      }, 2000);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <ThemedView style={styles.successContainer}>
        <ThemedText type="title" style={styles.title}>
          Password Updated
        </ThemedText>
        <ThemedText style={styles.successText}>
          Your password has been updated successfully. Redirecting to login...
        </ThemedText>
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
          Enter your new password below.
        </ThemedText>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: errors.password ? colors.tint : colors.border,
                },
              ]}
              placeholder="New Password"
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
            {errors.password && (
              <ThemedText style={[styles.errorText, { color: colors.tint }]}>
                {errors.password}
              </ThemedText>
            )}
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: errors.confirmPassword
                    ? colors.tint
                    : colors.border,
                },
              ]}
              placeholder="Confirm New Password"
              placeholderTextColor={colors.placeholder}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              onSubmitEditing={handleResetPassword}
            />
            {errors.confirmPassword && (
              <ThemedText style={[styles.errorText, { color: colors.tint }]}>
                {errors.confirmPassword}
              </ThemedText>
            )}
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
              {isLoading ? "Updating..." : "Update Password"}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.footer}>
            <ThemedText>Remember your password? </ThemedText>
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
    textAlign: "center",
    marginTop: 16,
    opacity: 0.8,
    lineHeight: 24,
  },
  form: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    width: "100%",
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
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
  footerLink: {
    fontWeight: "600",
  },
});
