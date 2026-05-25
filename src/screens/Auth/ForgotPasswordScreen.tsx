import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { TextInput, Text, HelperText, Snackbar } from "react-native-paper";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@config/firebase";
import { COLORS, SPACING } from "@constants/theme";
import { handleFirebaseError } from "@utils/errorHandler";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "@navigation/types";

type ForgotPasswordScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, "ForgotPassword">;
};

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  navigation,
}) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const handleResetPassword = async () => {
    if (isLoading) return;

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, email);
      setVisible(true);
    } catch (err: any) {
      setError(handleFirebaseError(err.code));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: COLORS.background }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email to receive a reset link
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

          {error && (
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>
          )}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.goBack}
          >
            <Text style={styles.linkText}>Back to Login</Text>
          </TouchableOpacity>
        </View>

        <Snackbar
          visible={visible}
          onDismiss={() => setVisible(false)}
          duration={3000}
          action={{
            label: "OK",
            onPress: () => navigation.navigate("Login"),
          }}
          style={styles.snackbar}
        >
          Password reset email sent! Check your inbox.
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    paddingBottom: 10,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: "center",
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
  button: {
    minHeight: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginTop: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.onPrimary,
    fontWeight: "700",
  },
  goBack: {
    marginTop: SPACING.xl,
    alignItems: "center",
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  snackbar: {
    backgroundColor: COLORS.success,
  },
});

export default ForgotPasswordScreen;
