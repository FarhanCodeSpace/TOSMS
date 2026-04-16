import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Platform, KeyboardAvoidingView, ScrollView } from "react-native";
import {
  TextInput,
  Button,
  Text,
  HelperText,
  Snackbar,
} from "react-native-paper";
import { useAuth } from "@hooks/useAuth";
import { COLORS, SPACING } from "@constants/theme";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { AuthStackParamList } from "@navigation/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { handleFirebaseError } from "@utils/errorHandler";

type LoginScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, "Login">;
  route: RouteProp<AuthStackParamList, "Login">;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState(route.params?.email || "");
  const [password, setPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

  useEffect(() => {
    if (route.params?.successMessage) {
      setSuccessVisible(true);
      // Optional: Clear params if needed, but navigation state can handle it
    }
  }, [route.params?.successMessage]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
      // Wait a bit to let the navigation happen through the RootNavigator
      setTimeout(() => {
        setIsLoading(false);
      }, 5000);
    } catch (err: any) {
      setIsLoading(false);
      setError(handleFirebaseError(err.code));
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="bus-clock" size={40} color="white" />
          </View>
          <Text style={styles.logoText}>TOSMS</Text>
          <Text style={styles.subtitle}>
            Transport Management
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
            left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="email-outline" size={24} color={COLORS.textSecondary} />} />}
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
            left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="lock-outline" size={24} color={COLORS.textSecondary} />} />}
            right={
              <TextInput.Icon
                icon={() => <MaterialCommunityIcons name={secureText ? "eye-outline" : "eye-off-outline"} size={24} color={COLORS.textSecondary} />}
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
            textColor={COLORS.onPrimary}
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
      </KeyboardAvoidingView>

      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={4000}
        style={styles.snackbar}
        action={{
          label: 'OK',
          labelStyle: { color: '#FFF' },
          onPress: () => setSuccessVisible(false),
        }}
      >
        <Text style={styles.snackbarText}>{route.params?.successMessage}</Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingBottom: 10,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  logoContainer: {
    backgroundColor: COLORS.primary,
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 2,
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
  snackbar: {
    backgroundColor: "#16A34A",
    borderRadius: 8,
  },
  snackbarText: {
    color: "#FFF",
    fontWeight: "600",
  },
});

export default LoginScreen;
