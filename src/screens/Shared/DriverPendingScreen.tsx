import React, { useEffect } from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Button } from "react-native-paper";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@config/firebase";
import { COLLECTIONS } from "@config/firebaseCollections";
import { useAuth } from "@hooks/useAuth";
import { COLORS, SPACING } from "@constants/theme";
import { User } from "@types";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const DriverPendingScreen: React.FC = () => {
  const { currentUser, updateUser, logout } = useAuth();

  useEffect(() => {
    if (!currentUser?.uid) {
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.USERS, currentUser.uid),
      (userDoc) => {
        if (!userDoc.exists()) {
          return;
        }

        const userData = userDoc.data() as User;
        if (userData.approved) {
          updateUser({
            approved: true,
            status: userData.status,
            profileComplete: userData.profileComplete,
          });
        }
      },
      () => {
        // silently handle error
      },
    );

    return () => unsubscribe();
  }, [currentUser, updateUser]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="account-clock-outline"
            size={80}
            color={COLORS.primary}
          />
          <View style={styles.pulseRing} />
        </View>

        <Text style={styles.title}>Profile Under Review</Text>
        <Text style={styles.subtitle}>
          Our team is currently verifying your documents. You'll receive a
          notification once your account is activated.
        </Text>

        <View style={styles.infoBox}>
          <MaterialCommunityIcons
            name="information-outline"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.infoText}>
            Verification usually takes less than 24 hours.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="text"
            onPress={logout}
            style={styles.secondaryButton}
            textColor={COLORS.textSecondary}
          >
            Logout & Exit
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    padding: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 40,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: COLORS.primary,
    opacity: 0.1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 12,
    marginBottom: 40,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  secondaryButton: {
    marginTop: 8,
  },
});

export default DriverPendingScreen;
