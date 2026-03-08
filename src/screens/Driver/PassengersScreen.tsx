import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Linking, Animated, TouchableOpacity } from 'react-native';
import { Text, Card, Searchbar, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { COLORS, SPACING } from '@constants/theme';
import { StackScreenProps } from '@react-navigation/stack';
import { DriverActiveRideStackParamList } from '@navigation/types';
import { Booking } from '@types';

type PassengersScreenProps = StackScreenProps<DriverActiveRideStackParamList, 'Passengers'>;

export const PassengersScreen: React.FC<any> = ({ route }) => {
  const { rideId } = route.params as { rideId: string };
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.BOOKINGS),
      where('rideId', '==', rideId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBookings: Booking[] = [];
      snapshot.forEach((doc) => {
        fetchedBookings.push({ bookingId: doc.id, ...doc.data() } as Booking);
      });
      // Sort so 'boarded' and 'completed' go to the bottom, active at top
      fetchedBookings.sort((a, b) => {
        if (a.status === 'boarded' && b.status !== 'boarded') return 1;
        if (a.status !== 'boarded' && b.status === 'boarded') return -1;
        return a.seatNumber - b.seatNumber;
      });
      setBookings(fetchedBookings);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [rideId]);

  const handleBoarded = async (bookingId: string) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.BOOKINGS, bookingId), {
        status: 'boarded'
      });
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const filteredBookings = bookings.filter(b => 
    b.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.seatNumber.toString().includes(searchQuery)
  );

  const totalBooked = bookings.length;
  // Normally we'd get total seats from ride doc, but it's not strictly passed in params so we'll just show boarded out of booked,
  // or pass totalSeats in the future if needed. Showing boarded/booked counts.
  const boardedCount = bookings.filter(b => b.status === 'boarded' || b.status === 'completed').length;

  const renderRightActions = (progress: any, dragX: any, bookingId: string, currentStatus: string) => {
    if (currentStatus === 'boarded' || currentStatus === 'completed' || currentStatus === 'cancelled') {
        return null;
    }
    
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActionContainer}>
        <Animated.Text
          style={[
            styles.actionText,
            { transform: [{ translateX: trans }] },
          ]}
          onPress={() => handleBoarded(bookingId)}
        >
          Boarded ✓
        </Animated.Text>
      </View>
    );
  };

  const getStatusColor = (status: Booking['paymentStatus']) => {
    switch (status) {
      case 'paid': return COLORS.success;
      case 'cash_pending': return COLORS.accent;
      default: return COLORS.error;
    }
  };
  
  const getStatusLabel = (status: Booking['paymentStatus']) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'cash_pending': return 'Cash on Pickup';
      default: return 'Pending';
    }
  };

  const renderItem = ({ item }: { item: Booking }) => {
    const isBoarded = item.status === 'boarded' || item.status === 'completed';

    return (
      <Swipeable
        renderRightActions={(prog, drag) => renderRightActions(prog, drag, item.bookingId, item.status)}
        enabled={!isBoarded && item.status !== 'cancelled'}
      >
        <Card style={[styles.card, isBoarded && styles.cardBoarded]}>
          <Card.Content style={styles.cardContent}>
            <View style={[styles.seatBadge, isBoarded && styles.seatBadgeBoarded]}>
              <Text style={styles.seatNumber}>{item.seatNumber}</Text>
            </View>

            <View style={styles.infoContainer}>
              <Text style={styles.studentName} numberOfLines={1}>{item.studentName}</Text>
              <Text 
                style={styles.phoneLink} 
                onPress={() => handleCall(item.studentPhone)}
              >
                {item.studentPhone}
              </Text>
              <Text style={styles.pickupStop}>📍 {item.pickupStop}</Text>
            </View>

            <View style={styles.statusContainer}>
              {isBoarded ? (
                <Chip icon="check" style={styles.boardedChip} textStyle={{ color: 'white' }}>Boarded</Chip>
              ) : (
                <Chip 
                  textStyle={{ color: 'white', fontSize: 10 }}
                  style={[styles.paymentChip, { backgroundColor: getStatusColor(item.paymentStatus) }]}
                >
                  {getStatusLabel(item.paymentStatus)}
                </Chip>
              )}
            </View>
          </Card.Content>
        </Card>
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Floating Back Button ── */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => (route.params as any).navigation.goBack()}
      >
        <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.text} />
      </TouchableOpacity>

      {/* Header Card (No Money info!) */}
      <Card style={styles.headerCard}>
        <Card.Content style={styles.headerContent}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Boarded</Text>
            <Text style={styles.statValue}>{boardedCount}</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: '#E0E0E0' }]}>
            <Text style={styles.statLabel}>Expected</Text>
            <Text style={styles.statValue}>{totalBooked}</Text>
          </View>
        </Card.Content>
      </Card>

      <Searchbar
        placeholder="Search passenger or seat..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        elevation={1}
      />

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.bookingId}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No passengers found</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerCard: {
    margin: SPACING.md,
    backgroundColor: COLORS.surface,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  searchbar: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  card: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    elevation: 2,
  },
  cardBoarded: {
    backgroundColor: '#F5F5F5',
    opacity: 0.8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  seatBadgeBoarded: {
    backgroundColor: COLORS.success,
  },
  seatNumber: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoContainer: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  phoneLink: {
    fontSize: 14,
    color: COLORS.primary,
    textDecorationLine: 'underline',
    marginBottom: 4,
  },
  pickupStop: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  paymentChip: {
    height: 28,
  },
  boardedChip: {
    backgroundColor: COLORS.success,
    height: 32,
  },
  rightActionContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    backgroundColor: COLORS.success,
    marginBottom: SPACING.md,
    borderRadius: 8,
    flex: 1,
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingVertical: 30,
    fontSize: 16, 
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  }
});

export default PassengersScreen;
