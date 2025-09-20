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

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { signUp, isLoading, error } = useAuthStore();

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error);
    }
  }, [error]);

  const validate = () => {
    const newErrors: { name?: string; email?: string; password?: string } = {};

    if (!name) newErrors.name = "Full name is required";

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

  const handleSignUp = async () => {
    if (!validate()) return;

    const { error } = await signUp(email, password, name);

    if (!error) {
      // Email verification is required
      Alert.alert(
        "Check your email",
        "We've sent you a verification email. Please check your inbox and verify your email address."
      );
      router.replace("/(auth)/login");
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
          Create Account
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Get started with your health journey
        </ThemedText>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: errors.name ? colors.tint : colors.border,
                },
              ]}
              placeholder="Full Name"
              placeholderTextColor={colors.placeholder}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) {
                  setErrors({ ...errors, name: undefined });
                }
              }}
              autoCapitalize="words"
              autoComplete="name"
            />
            {errors.name && (
              <ThemedText style={[styles.errorText, { color: colors.tint }]}>
                {errors.name}
              </ThemedText>
            )}
          </View>

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
              placeholder="Password (min 6 characters)"
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) {
                  setErrors({ ...errors, password: undefined });
                }
              }}
              secureTextEntry
              autoComplete="new-password"
              onSubmitEditing={handleSignUp}
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
            onPress={handleSignUp}
            disabled={isLoading}
          >
            <ThemedText style={styles.buttonText}>
              {isLoading ? "Creating Account..." : "Sign Up"}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Already have an account?{" "}
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
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
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
