import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Avatar, Card, IconButton, FAB, ProgressBar, Button, useTheme } from 'react-native-paper';
import { useAuth } from '@hooks/useAuth';
import { COLORS, SPACING } from '@constants/theme';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { collection, query, where, getDocs, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { format, isToday, startOfMonth } from 'date-fns';
import { Ride } from '@types';
import { StackNavigationProp } from '@react-navigation/stack';
import { DriverHomeStackParamList } from '@navigation/types';

type DriverHomeScreenProps = {
  navigation: StackNavigationProp<DriverHomeStackParamList, 'DriverHome'>;
};

const DriverHomeScreen: React.FC<DriverHomeScreenProps> = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [upcomingRides, setUpcomingRides] = useState<Ride[]>([]);
  const [stats, setStats] = useState({
    monthlyRides: 0,
    totalEarnings: 0,
    avgRating: currentUser?.rating || 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const firstOfMonth = startOfMonth(new Date());
      const ridesQuery = query(
        collection(db, COLLECTIONS.RIDES),
        where('driverId', '==', currentUser.uid),
        where('status', '==', 'completed'),
        where('departureTime', '>=', Timestamp.fromDate(firstOfMonth))
      );
      
      const querySnapshot = await getDocs(ridesQuery);
      let monthlyRides = 0;
      let totalEarnings = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Ride;
        monthlyRides++;
        // Calculate earnings: farePerSeat * (totalSeats - availableSeats)
        totalEarnings += data.farePerSeat * (data.totalSeats - data.availableSeats);
      });
      
      setStats({
        monthlyRides,
        totalEarnings,
        avgRating: currentUser.rating || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    if (!currentUser?.uid) return;

    const upcomingQuery = query(
      collection(db, COLLECTIONS.RIDES),
      where('driverId', '==', currentUser.uid),
      where('status', '==', 'scheduled'),
      where('departureTime', '>=', Timestamp.now()),
      orderBy('departureTime', 'asc')
    );

    const unsubscribe = onSnapshot(upcomingQuery, (snapshot) => {
      const rides: Ride[] = [];
      snapshot.forEach((doc) => {
        rides.push({ rideId: doc.id, ...doc.data() } as Ride);
      });
      setUpcomingRides(rides);
      setIsLoading(false);
      setRefreshing(false);
    });

    fetchStats();

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const renderRideCard = ({ item }: { item: Ride }) => {
    const bookedSeats = item.totalSeats - item.availableSeats;
    const progress = bookedSeats / item.totalSeats;
    const departureDate = item.departureTime.toDate();
    const formattedTime = isToday(departureDate) 
      ? `Today at ${format(departureDate, 'h:mm a')}`
      : format(departureDate, 'MMM d, h:mm a');

    return (
      <Card style={styles.rideCard}>
        <Card.Content>
          <View style={styles.rideHeader}>
            <View>
              <Text style={styles.routeText}>{item.routeName}</Text>
              <Text style={styles.timeText}>{formattedTime}</Text>
            </View>
            <Text style={styles.fareText}>PKR {item.farePerSeat}</Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Seats Booked</Text>
              <Text style={styles.progressValue}>{bookedSeats}/{item.totalSeats}</Text>
            </View>
            <ProgressBar progress={progress} color={COLORS.primary} style={styles.progressBar} />
          </View>

          <View style={styles.cardActions}>
            <Button 
              mode="contained" 
              onPress={() => navigation.navigate('ActiveRide' as any, { rideId: item.rideId })}
              style={styles.actionButton}
              buttonColor={COLORS.primary}
            >
              Start Ride
            </Button>
            <Button 
              mode="outlined" 
              onPress={() => navigation.navigate('Passengers' as any, { rideId: item.rideId })}
              style={styles.actionButton}
              textColor={COLORS.primary}
            >
              Passengers
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={styles.userInfo}>
            {currentUser?.profileImageUrl ? (
              <Avatar.Image size={50} source={{ uri: currentUser.profileImageUrl }} />
            ) : (
              <Avatar.Text size={50} label={getInitials(currentUser?.fullName || 'U')} style={{ backgroundColor: COLORS.primary }} />
            )}
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.greetingText}>{getGreeting()},</Text>
              <Text style={styles.userNameText}>{currentUser?.fullName}</Text>
            </View>
          </View>
          <IconButton icon="bell-outline" size={24} iconColor={COLORS.text} onPress={() => {}} />
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Text style={styles.statValue}>{stats.monthlyRides}</Text>
              <Text style={styles.statLabel}>Rides/Mo</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Text style={styles.statValue}>{stats.totalEarnings}</Text>
              <Text style={styles.statLabel}>PKR</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Text style={styles.statValue}>{stats.avgRating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Upcoming Rides</Text>
        </View>

        {upcomingRides.length > 0 ? (
          <FlatList
            data={upcomingRides}
            renderItem={renderRideCard}
            keyExtractor={(item) => item.rideId}
            scrollEnabled={false}
            contentContainerStyle={styles.ridesList}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🚌</Text>
            <Text style={styles.emptyText}>No upcoming rides. Create one!</Text>
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateRide')}
        color="white"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeTextContainer: {
    marginLeft: SPACING.md,
  },
  greetingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 0.31,
    backgroundColor: COLORS.surface,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  ridesList: {
    paddingBottom: SPACING.md,
  },
  rideCard: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    elevation: 2,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  routeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  timeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  fareText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  progressContainer: {
    marginBottom: SPACING.md,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 0.48,
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
});

export default DriverHomeScreen;
