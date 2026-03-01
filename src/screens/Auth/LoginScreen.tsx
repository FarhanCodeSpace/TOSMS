import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import {
  TextInput,
  Button,
  Text,
  HelperText,
  useTheme,
} from "react-native-paper";
import { useAuth } from "@hooks/useAuth";
import { COLORS, SPACING } from "@constants/theme";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "@navigation/types";

type LoginScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, "Login">;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
    } catch (err: any) {
      console.error("Login error:", err.code);
      switch (err.code) {
        case "auth/invalid-email":
          setError("Invalid email address format");
          break;
        case "auth/user-not-found":
          setError("No account found with this email");
          break;
        case "auth/wrong-password":
          setError("Incorrect password");
          break;
        case "auth/too-many-requests":
          setError("Too many attempts. Try again later");
          break;
        case "auth/network-request-failed":
          setError("No internet connection");
          break;
        default:
          setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoEmoji}>🚌</Text>
        <Text style={styles.logoText}>TOSMS</Text>
        <Text style={styles.subtitle}>
          Transport Operations & Safety Management System
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          outlineColor={COLORS.primary}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
          disabled={isLoading}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry={secureText}
          outlineColor={COLORS.primary}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
          disabled={isLoading}
          right={
            <TextInput.Icon
              icon={secureText ? "eye" : "eye-off"}
              onPress={() => setSecureText(!secureText)}
            />
          }
        />

        {error && (
          <HelperText type="error" visible={!!error} style={styles.errorText}>
            {error}
          </HelperText>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate("ForgotPassword")}
          style={styles.forgotPassword}
        >
          <Text style={styles.linkText}>Forgot Password?</Text>
        </TouchableOpacity>

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
          contentStyle={styles.buttonContent}
          buttonColor={COLORS.primary}
        >
          Login
        </Button>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={[styles.linkText, { fontWeight: "bold" }]}>
              Register
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  logoEmoji: {
    fontSize: 64,
    marginBottom: SPACING.xs,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.primary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
  form: {
    width: "100%",
  },
  input: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  errorText: {
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: SPACING.lg,
  },
  button: {
    borderRadius: 8,
    marginTop: SPACING.sm,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: SPACING.xl,
  },
  footerText: {
    color: COLORS.text,
  },
  linkText: {
    color: COLORS.primary,
  },
});

export default LoginScreen;
