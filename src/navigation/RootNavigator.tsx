import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "@hooks/useAuth";
import { AuthNavigator } from "./AuthNavigator";
import { StudentNavigator } from "./StudentNavigator";
import { DriverNavigator } from "./DriverNavigator";
import { DriverPendingScreen } from "@screens/Shared";
import { COLORS } from "@constants/theme";
import {
  registerForPushNotifications,
  setupNotificationListeners,
  arePushNotificationsSupported,
} from "../services/notificationService";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@config/firebase";
import InAppNotificationBanner from "../components/common/InAppNotificationBanner";
import { navigationRef } from "./navigationRef";

export const RootNavigator = () => {
  const { currentUser, isLoading, isAuthenticated } = useAuth();
  const [notification, setNotification] = useState<any>(null);

  useEffect(() => {
    if (
      isAuthenticated &&
      currentUser?.uid &&
      arePushNotificationsSupported()
    ) {
      registerForPushNotifications(currentUser.uid);

      const cleanup = setupNotificationListeners(navigationRef, (notif) => {
        setNotification(notif);
      });

      return () => cleanup();
    }
  }, [isAuthenticated, currentUser?.uid]);

  // Handle global auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        // User logged out - navigation will automatically switch to AuthNavigator
        // because isAuthenticated is false in context
        // This ensures a clean reset of navigation state
      }
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const renderContent = () => {
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

  return (
    <>
      {renderContent()}
      <InAppNotificationBanner
        notification={notification}
        onDismiss={() => setNotification(null)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
