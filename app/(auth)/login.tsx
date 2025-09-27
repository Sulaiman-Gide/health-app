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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { signIn, isLoading, error } = useAuthStore();

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error);
    }
  }, [error]);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    const { error, isAdmin } = await signIn(email, password);

    if (!error) {
      if (isAdmin) {
        router.replace("/(admin)");
      } else {
        router.replace("/(app)");
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ThemedView style={styles.innerContainer}>
        <ThemedText type="title" style={styles.title}>
          Welcome Back
        </ThemedText>
        <ThemedText style={styles.subtitle}>Sign in to continue</ThemedText>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: errors.email ? colors.tint : colors.border,
                },
              ]}
              placeholder="Email"
              placeholderTextColor={colors.placeholder}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) {
                  setErrors({ ...errors, email: undefined });
                }
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            {errors.email && (
              <ThemedText style={[styles.errorText, { color: colors.tint }]}>
                {errors.email}
              </ThemedText>
            )}
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: errors.password ? colors.tint : colors.border,
                },
              ]}
              placeholder="Password"
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) {
                  setErrors({ ...errors, password: undefined });
                }
              }}
              secureTextEntry
              autoComplete="current-password"
              onSubmitEditing={handleLogin}
            />
            {errors.password && (
              <ThemedText style={[styles.errorText, { color: colors.tint }]}>
                {errors.password}
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
            onPress={handleLogin}
            disabled={isLoading}
          >
            <ThemedText style={styles.buttonText}>
              {isLoading ? "Signing in..." : "Sign In"}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Don't have an account?{" "}
            </ThemedText>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <ThemedText style={[styles.footerLink, { color: colors.tint }]}>
                  Sign up
                </ThemedText>
              </TouchableOpacity>
            </Link>
          </View>

          <View style={styles.forgotPasswordContainer}>
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity>
                <ThemedText
                  style={[styles.forgotPassword, { color: colors.tint }]}
                >
                  Forgot your password?
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
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  forgotPassword: {
    fontSize: 14,
    fontWeight: "500",
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});
