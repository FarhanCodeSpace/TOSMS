import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "@hooks/useAuth";
import { AuthNavigator } from "./AuthNavigator";
import { StudentNavigator } from "./StudentNavigator";
import { DriverNavigator } from "./DriverNavigator";
import { DriverPendingScreen } from "@screens/Shared";
import { COLORS } from "@constants/theme";

export const RootNavigator = () => {
  const { currentUser, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <AuthNavigator key="auth" />;
  }

  if (currentUser.role === "driver") {
    if (!currentUser.profileComplete) {
      return (
        <AuthNavigator key="driver-setup" initialRoute="DriverProfileSetup" />
      );
    }
    return currentUser.approved ? (
      <DriverNavigator key="driver-approved" />
    ) : (
      <DriverPendingScreen key="driver-pending" />
    );
  }

  return <StudentNavigator key="student" />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
