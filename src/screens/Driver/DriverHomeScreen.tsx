import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Avatar, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@hooks/useAuth';
import { COLORS } from '@constants/theme';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { collection, query, where, getDocs, onSnapshot, Timestamp, doc } from 'firebase/firestore';
import { format, addDays } from 'date-fns';
import { Ride } from '@types';
import { StackNavigationProp } from '@react-navigation/stack';
import { DriverHomeStackParamList } from '@navigation/types';

type DriverHomeScreenProps = {
  navigation: StackNavigationProp<DriverHomeStackParamList, 'DriverHome'>;
};

const DriverHomeScreen: React.FC<DriverHomeScreenProps> = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [upcomingRides, setUpcomingRides] = useState<Ride[]>([]);
  const [driverStats, setDriverStats] = useState({
    totalRoutes: 1,
    rating: currentUser?.rating || 0,
  });
  const [driverAvailabilityDoc, setDriverAvailabilityDoc] = useState<any>(null);
  const [tomorrowStudentsStats, setTomorrowStudentsStats] = useState({
    available: 0,
    unavailable: 0,
    noResponse: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [myRouteData, setMyRouteData] = useState<any>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;

    // 1. Upcoming Rides Listener
    const upcomingQuery = query(
      collection(db, COLLECTIONS.RIDES),
      where('driverId', '==', currentUser.uid),
      where('status', '==', 'scheduled'),
      where('departureTime', '>=', Timestamp.now())
    );

    const unsubscribeUpcoming = onSnapshot(upcomingQuery, (snapshot) => {
      const rides: Ride[] = [];
      snapshot.forEach((doc) => {
        rides.push({ rideId: doc.id, ...doc.data() } as Ride);
      });
      setUpcomingRides(rides.sort((a,b) => a.departureTime.toMillis() - b.departureTime.toMillis()));
    });

    // 2. Tomorrow's Students Summary Logic
    const fetchTomorrowStudents = async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      try {
        const routeQuery = query(
          collection(db, COLLECTIONS.ROUTES),
          where('assignedDriverId', '==', currentUser.uid)
        );
        const routeSnap = await getDocs(routeQuery);
        
        if (!routeSnap.empty) {
          const routeData = routeSnap.docs[0].data();
          setMyRouteData({ routeId: routeSnap.docs[0].id, ...routeData });
          const studentIds = routeData.studentIds || [];
          
          if (studentIds.length > 0) {
            const statusMap: Record<string, string> = {};
            const unsubs = studentIds.map((sid: string) => {
              const docId = `${sid}_${tomorrowStr}`;
              return onSnapshot(doc(db, COLLECTIONS.AVAILABILITY, docId), (docSnap) => {
                let currentStatus = 'no-response';
                if (docSnap.exists()) {
                  currentStatus = docSnap.data().isAvailable ? 'available' : 'unavailable';
                }
                statusMap[sid] = currentStatus;
                
                const countsArray = Object.values(statusMap);
                const available = countsArray.filter(s => s === 'available').length;
                const unavailable = countsArray.filter(s => s === 'unavailable').length;

                setTomorrowStudentsStats({
                  available: available,
                  unavailable: unavailable,
                  noResponse: studentIds.length - (available + unavailable),
                });
              });
            });
            return () => unsubs.forEach((unsub: any) => unsub());
          }
        }
      } catch (error) {
        console.error('Error fetching tomorrow students:', error);
      }
    };

    const cleanupTomorrow = fetchTomorrowStudents();

    // 3. Driver Availability Listener
    const tomorrow = addDays(new Date(), 1);
    const tomorrowDateString = format(tomorrow, 'yyyy-MM-dd');
    const availDocId = currentUser.uid + '_' + tomorrowDateString;
    const unsubscribeAvail = onSnapshot(doc(db, COLLECTIONS.AVAILABILITY, availDocId), (snapshot) => {
      setDriverAvailabilityDoc(snapshot.exists() ? snapshot.data() : null);
    });

    return () => {
      unsubscribeUpcoming();
      unsubscribeAvail();
      cleanupTomorrow.then(cleanup => cleanup && cleanup());
    };
  }, [currentUser?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
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

  const getAvailabilityColor = () => {
    if (driverAvailabilityDoc === null) return '#FFF9E6'; // yellow
    return driverAvailabilityDoc.isAvailable ? '#F0FFF4' : '#FFF0F0'; // green or red
  };

  const getAvailabilityStatusText = () => {
    if (driverAvailabilityDoc === null) return 'Not marked';
    return driverAvailabilityDoc.isAvailable ? 'Available' : 'Unavailable';
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.newHeader}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.newGreetingText}>{getGreeting()}</Text>
              <Text style={styles.newUserNameText}>{currentUser?.fullName}</Text>
            </View>
            {currentUser?.profileImageUrl ? (
              <Avatar.Image size={44} source={{ uri: currentUser.profileImageUrl }} />
            ) : (
              <Avatar.Text size={44} label={getInitials(currentUser?.fullName || 'U')} style={{ backgroundColor: COLORS.accent }} />
            )}
          </View>
        </View>

        <View style={styles.newStatsRow}>
          <View style={styles.statsCol}>
            <Text style={styles.statsNumber}>{tomorrowStudentsStats.available}</Text>
            <Text style={styles.statsLabel}>Tomorrow Available</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statsCol}>
            <Text style={styles.statsNumber}>{driverStats.totalRoutes}</Text>
            <Text style={styles.statsLabel}>Total Routes</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statsCol}>
            <Text style={styles.statsNumber}>{driverStats.rating.toFixed(1)}</Text>
            <Text style={styles.statsLabel}>Rating</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickCardsScroll}>
          {driverAvailabilityDoc === null ? (
            <TouchableOpacity 
              style={[styles.miniCard, styles.notMarkedCard]}
              onPress={() => navigation.navigate('DriverAvailability')}
            >
              <View style={styles.miniCardHeader}>
                <MaterialCommunityIcons name="calendar-today" size={16} color="#F59E0B" />
                <Text style={[styles.miniCardTitle, { color: '#92400E' }]}>Availability</Text>
              </View>
              <Text style={styles.notMarkedStatusText}>Tap to mark</Text>
              <View style={styles.statusDotRow}>
                <View style={[styles.miniDot, { backgroundColor: '#F59E0B' }]} />
              </View>
            </TouchableOpacity>
          ) : driverAvailabilityDoc.isAvailable ? (
            <TouchableOpacity 
              style={[styles.miniCard, styles.availableCard]}
              onPress={() => navigation.navigate('DriverAvailability')}
            >
              <View style={styles.miniCardHeader}>
                <MaterialCommunityIcons name="calendar-check" size={16} color="#16A34A" />
                <Text style={[styles.miniCardTitle, { color: '#16A34A' }]}>Availability</Text>
              </View>
              <View style={styles.miniCardStatusRow}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#16A34A" />
                <Text style={[styles.miniCardStatus, { color: '#16A34A' }]}>Available</Text>
              </View>
              <Text style={styles.miniCardSub}>Vehicle {driverAvailabilityDoc.vehicleAvailable ? '✓' : '✗'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.miniCard, styles.unavailableCard]}
              onPress={() => navigation.navigate('DriverAvailability')}
            >
              <View style={styles.miniCardHeader}>
                <MaterialCommunityIcons name="close-circle" size={16} color="#DC2626" />
                <Text style={[styles.miniCardTitle, { color: '#DC2626' }]}>Not Available</Text>
              </View>
              <Text style={[styles.miniCardStatus, { color: '#DC2626', marginTop: 6 }]}>Not Available</Text>
              <Text style={styles.miniCardSub}>Backup arranged</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.miniCard, styles.whiteMiniCard]} onPress={() => (navigation as any).navigate('MyRouteTab')}>
            <View style={styles.miniCardHeader}>
              <MaterialCommunityIcons name="map-marker-path" size={16} color={COLORS.primary} />
              <Text style={[styles.miniCardTitle, { color: COLORS.primary }]}>My Route</Text>
            </View>
            <Text style={styles.miniCardStatusText} numberOfLines={1}>{myRouteData?.routeName || 'No Route'}</Text>
            <Text style={styles.miniCardSub}>View details</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.sectionPadding}>
          <Text style={styles.newSectionTitle}>Tomorrow's Overview</Text>
          <View style={styles.overviewCard}>
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={[styles.overviewNumber, { color: '#16A34A' }]}>{tomorrowStudentsStats.available}</Text>
                <Text style={styles.overviewLabel}>Available</Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={[styles.overviewNumber, { color: '#DC2626' }]}>{tomorrowStudentsStats.unavailable}</Text>
                <Text style={styles.overviewLabel}>Not Available</Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={[styles.overviewNumber, { color: COLORS.textSecondary }]}>{tomorrowStudentsStats.noResponse}</Text>
                <Text style={styles.overviewLabel}>No Response</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionPadding}>
          <Text style={styles.newSectionTitle}>Upcoming Rides</Text>
          {upcomingRides.length > 0 ? (
            upcomingRides.map((ride) => {
              const departureDate = ride.departureTime.toDate();
              const formattedTime = format(departureDate, 'h:mm a');
              return (
                <View key={ride.rideId} style={styles.newRideCard}>
                  <Text style={styles.newRideRouteName}>{ride.routeName}</Text>
                  <View style={styles.rideInfoRow}>
                    <View style={styles.rideInfoItem}>
                      <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.rideInfoText}>{formattedTime}</Text>
                    </View>
                    <View style={styles.rideInfoItem}>
                      <MaterialCommunityIcons name="account-group" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.rideInfoText}>{ride.totalSeats - ride.availableSeats} Students</Text>
                    </View>
                  </View>
                  <Button 
                    mode="contained" 
                    onPress={() => navigation.navigate('ActiveRide' as any, { rideId: ride.rideId })}
                    style={styles.newRideButton}
                    buttonColor={COLORS.primary}
                    labelStyle={{ fontWeight: '600' }}
                  >
                    Start Ride
                  </Button>
                </View>
              );
            })
          ) : (
            <View style={styles.newEmptyContainer}>
              <MaterialCommunityIcons name="bus-alert" size={48} color={COLORS.textSecondary} opacity={0.3} />
              <Text style={styles.newEmptyText}>No upcoming rides scheduled.</Text>
            </View>
          )}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  newHeader: { backgroundColor: '#1A3C5E', padding: 20, paddingTop: 50 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  newGreetingText: { fontSize: 13, color: 'white', opacity: 0.8 },
  newUserNameText: { fontSize: 20, fontWeight: '700', color: 'white', marginTop: 2 },
  newStatsRow: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#F3F4F6', alignItems: 'center' },
  statsCol: { flex: 1, alignItems: 'center' },
  statsNumber: { fontSize: 22, fontWeight: '700', color: COLORS.primary },
  statsLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  divider: { width: 1, height: 30, backgroundColor: '#F3F4F6' },
  quickCardsScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  miniCard: { width: 150, borderRadius: 12, padding: 14, justifyContent: 'center', borderWidth: 1.5 },
  whiteMiniCard: { backgroundColor: 'white', borderColor: '#E5E7EB' },
  notMarkedCard: { backgroundColor: '#FFF9E6', borderColor: '#F59E0B' },
  availableCard: { backgroundColor: '#F0FFF4', borderColor: '#16A34A' },
  unavailableCard: { backgroundColor: '#FFF0F0', borderColor: '#DC2626' },
  miniCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  miniCardTitle: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
  miniCardStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  miniCardStatus: { fontSize: 13, fontWeight: '600' },
  notMarkedStatusText: { fontSize: 13, color: '#92400E', marginTop: 6 },
  statusDotRow: { alignSelf: 'flex-start', marginTop: 4 },
  miniDot: { width: 8, height: 8, borderRadius: 4 },
  miniCardStatusText: { fontSize: 13, fontWeight: '500', color: COLORS.text, marginTop: 6 },
  miniCardSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  sectionPadding: { paddingHorizontal: 16, paddingTop: 8 },
  newSectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 10, marginTop: 10 },
  overviewCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  overviewItem: { alignItems: 'center', flex: 1 },
  overviewNumber: { fontSize: 18, fontWeight: 'bold' },
  overviewLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  newRideCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, elevation: 2, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  newRideRouteName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  rideInfoRow: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  rideInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rideInfoText: { fontSize: 13, color: COLORS.textSecondary },
  newRideButton: { borderRadius: 8, paddingVertical: 2 },
  newEmptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', borderStyle: 'dashed' },
  newEmptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 10 },
});

export default DriverHomeScreen;
