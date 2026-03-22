import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { doc, getDoc } from 'firebase/firestore';
import { COLORS, SPACING } from '@constants/theme';
import { StackScreenProps } from '@react-navigation/stack';
import { DriverActiveRideStackParamList } from '@navigation/types';
import { Ride } from '@types';
import { format } from 'date-fns';
import { CommonActions } from '@react-navigation/native';

type RideSummaryScreenProps = StackScreenProps<DriverActiveRideStackParamList, 'RideSummary'>;

export const RideSummaryScreen: React.FC<any> = ({ route, navigation }) => {
  const { rideId } = route.params as { rideId: string };
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRide = async () => {
      try {
        const rideRef = doc(db, COLLECTIONS.RIDES, rideId);
        const rideSnap = await getDoc(rideRef);
        if (rideSnap.exists()) {
          setRide(rideSnap.data() as Ride);
        }
      } catch (error) {
        console.error('Error fetching completed ride:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRide();
  }, [rideId]);

  const handleBackToHome = () => {
    // Reset the stack to DriverHome so they can't swipe back to the summary or active ride
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          // Navigating to the parent Tab navigator's HomeTab
          { name: 'HomeTab' as any }
        ],
      })
    );
  };

  if (loading || !ride) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: SPACING.md }}>Loading Final Details...</Text>
      </View>
    );
  }

  const boardedCount = ride.boardedCount !== undefined ? ride.boardedCount : (ride.completedStudentIds?.length || 0);

  const dateStr = ride.date ? format(new Date(ride.date), 'MMM d, yyyy') : String(ride.departureTime || '--');

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialCommunityIcons name="check-circle-outline" size={80} color={COLORS.success} />
        <Text style={styles.title}>Ride Completed!</Text>
        <Text style={styles.subtitle}>Great job for the day.</Text>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.detailLabel}>Route</Text>
            <Text style={styles.detailValue}>{ride.routeName}</Text>
            
            <View style={styles.divider} />
            
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{dateStr}</Text>

            <View style={styles.divider} />
            
            <Text style={styles.detailLabel}>Total Passengers</Text>
            <Text style={styles.detailValue}>{boardedCount} Boarded</Text>
            
            {/* NO FINANCIAL DATA RENDERED AS REQUESTED */}
          </Card.Content>
        </Card>
      </View>

      <Button 
        mode="contained" 
        onPress={handleBackToHome}
        style={styles.homeBtn}
        buttonColor={COLORS.primary}
      >
        Back to Home
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: SPACING.xl * 2,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    elevation: 4,
    borderRadius: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: SPACING.md,
  },
  homeBtn: {
    borderRadius: 8,
    paddingVertical: 6,
    marginBottom: SPACING.xl,
  }
});

export default RideSummaryScreen;
