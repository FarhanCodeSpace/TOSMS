import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { useAuth } from '@hooks/useAuth';
import { COLORS, SPACING } from '@constants/theme';
import { User } from '@types';

const DriverPendingScreen: React.FC = () => {
  const { currentUser, updateUser, logout } = useAuth();

  useEffect(() => {
    const checkApproval = async () => {
      if (currentUser?.uid) {
        try {
          const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            if (userData.approved) {
              updateUser({ approved: true });
            }
          }
        } catch (error) {
          console.error('Error checking approval status:', error);
        }
      }
    };

    const intervalId = setInterval(checkApproval, 10000); // Check every 10 seconds

    return () => clearInterval(intervalId);
  }, [currentUser, updateUser]);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🚌</Text>
      <Text style={styles.title}>Profile Under Review</Text>
      <Text style={styles.subtitle}>
        Your profile is being reviewed by our team. You will be notified once approved.
      </Text>
      
      <Button
        mode="outlined"
        onPress={logout}
        style={styles.logoutButton}
        textColor={COLORS.primary}
      >
        Logout
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  logoutButton: {
    marginTop: SPACING.xl,
    borderColor: COLORS.primary,
    borderRadius: 8,
  },
});

export default DriverPendingScreen;
