import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Platform, KeyboardAvoidingView, ScrollView } from "react-native";
import { TextInput, Button, Text, HelperText } from "react-native-paper";
import { useAuth } from "@hooks/useAuth";
import { COLORS, SPACING } from "@constants/theme";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "@navigation/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { handleFirebaseError } from "@utils/errorHandler";


type RegisterScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, "Register">;
};

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"student" | "driver">("student");
  const [secureText, setSecureText] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateInputs = () => {
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setError("All fields are required");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Invalid email format");
      return false;
    }
    if (phone.length !== 11 || !phone.startsWith("03")) {
      setError("Phone must be 11 digits starting with 03");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);
    setError(null);

    try {
      await register(email, password, fullName, phone, role);
      navigation.navigate("Login", { 
        successMessage: "Account created successfully! Please login to continue.",
        email: email
      });
    } catch (err: any) {
      setError(handleFirebaseError(err.code));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: COLORS.background }}
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
        <Text style={styles.subtitle}>Create your account to get started</Text>
      </View>

      <View style={styles.roleSelection}>
        <TouchableOpacity
          style={[
            styles.roleButton,
            role === "student"
              ? styles.roleButtonActive
              : styles.roleButtonInactive,
          ]}
          onPress={() => setRole("student")}
        >
          <Text
            style={[
              styles.roleText,
              role === "student"
                ? styles.roleTextActive
                : styles.roleTextInactive,
            ]}
          >
            <MaterialCommunityIcons 
              name="account-school" 
              size={18} 
              color={role === "student" ? COLORS.surface : COLORS.primary} 
            /> Student
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleButton,
            role === "driver"
              ? styles.roleButtonActive
              : styles.roleButtonInactive,
          ]}
          onPress={() => setRole("driver")}
        >
          <Text
            style={[
              styles.roleText,
              role === "driver"
                ? styles.roleTextActive
                : styles.roleTextInactive,
            ]}
          >
            <MaterialCommunityIcons 
              name="steering" 
              size={18} 
              color={role === "driver" ? COLORS.surface : COLORS.primary} 
            /> Driver
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <TextInput
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          mode="outlined"
          outlineColor={COLORS.primary}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
          disabled={isLoading}
          left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="account-outline" size={24} color={COLORS.textSecondary} />} />}
        />

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
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          mode="outlined"
          keyboardType="phone-pad"
          maxLength={11}
          placeholder="03XXXXXXXXX"
          outlineColor={COLORS.primary}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
          disabled={isLoading}
          left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="phone-outline" size={24} color={COLORS.textSecondary} />} />}
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

        <TextInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          mode="outlined"
          secureTextEntry={secureText}
          outlineColor={COLORS.primary}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
          disabled={isLoading}
          left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="lock-outline" size={24} color={COLORS.textSecondary} />} />}
        />

        {error && (
          <HelperText type="error" visible={!!error} style={styles.errorText}>
            {error}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleRegister}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
          contentStyle={styles.buttonContent}
          buttonColor={COLORS.primary}
          textColor={COLORS.onPrimary}
        >
          Register
        </Button>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={[styles.linkText, { fontWeight: "bold" }]}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: SPACING.lg,
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
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  roleSelection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
  },
  roleButton: {
    flex: 0.48,
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  roleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleButtonInactive: {
    backgroundColor: "transparent",
    borderColor: COLORS.primary,
  },
  roleText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  roleTextActive: {
    color: COLORS.surface,
  },
  roleTextInactive: {
    color: COLORS.primary,
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
    marginBottom: SPACING.xl,
  },
  footerText: {
    color: COLORS.text,
  },
  linkText: {
    color: COLORS.primary,
  },
});

export default RegisterScreen;
