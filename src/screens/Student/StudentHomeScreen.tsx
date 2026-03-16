import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text, Avatar, Card, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@hooks/useAuth';
import { COLORS } from '@constants/theme';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { collection, query, where, getDocs, onSnapshot, doc, limit } from 'firebase/firestore';
import { format, addDays, startOfWeek } from 'date-fns';
import { StackNavigationProp } from '@react-navigation/stack';
import { StudentHomeStackParamList } from '@navigation/types';

type StudentHomeScreenProps = {
  navigation: StackNavigationProp<StudentHomeStackParamList, 'StudentHome'>;
};

const StudentHomeScreen: React.FC<StudentHomeScreenProps> = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [myRoute, setMyRoute] = useState<any>(null);
  const [todayRide, setTodayRide] = useState<any>(null);
  const [feeStatus, setFeeStatus] = useState<'pending' | 'submitted' | 'verified'>('pending');
  const [feePayment, setFeePayment] = useState<any>(null);
  const [availabilityDoc, setAvailabilityDoc] = useState<any>(null);
  const [weekAvailability, setWeekAvailability] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  const tomorrow = addDays(new Date(), 1);
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

  useEffect(() => {
    if (!currentUser?.uid) return;

    // 1. Route Listener
    const routeQuery = query(
      collection(db, COLLECTIONS.ROUTES),
      where('studentIds', 'array-contains', currentUser.uid),
      limit(1)
    );
    const unsubscribeRoute = onSnapshot(routeQuery, (snapshot) => {
      if (!snapshot.empty) {
        setMyRoute({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setMyRoute(null);
      }
    });

    // 2. Today's Ride Listener
    const todayStr = new Date().toISOString().split('T')[0];
    const rideQuery = query(
      collection(db, COLLECTIONS.RIDES),
      where('date', '==', todayStr),
      where('status', 'in', ['scheduled', 'active'])
    );
    const unsubscribeRide = onSnapshot(rideQuery, (snapshot) => {
      const activeRide = snapshot.docs.find(doc => {
        const data = doc.data();
        return data.studentIds?.includes(currentUser.uid) || data.routeId === currentUser.routeId;
      });
      setTodayRide(activeRide ? { id: activeRide.id, ...activeRide.data() } : null);
    });

    // 3. Fee Status Listener
    const currentMonth = format(new Date(), 'yyyy-MM');
    const feeQuery = query(
      collection(db, COLLECTIONS.FEE_PAYMENTS),
      where('studentId', '==', currentUser.uid),
      where('month', '==', currentMonth),
      limit(1)
    );
    
    const unsubscribeFee = onSnapshot(feeQuery, (snapshot) => {
      if (!snapshot.empty) {
        const paymentData = snapshot.docs[0].data();
        setFeeStatus(paymentData.paymentStatus); // 'verified', 'submitted', or 'pending'
        setFeePayment(paymentData);
      } else {
        setFeeStatus('pending');
        setFeePayment(null);
      }
    });

    // 4. Availability Listener for Tomorrow
    const availDocId = `${currentUser.uid}_${tomorrowStr}`;
    const unsubscribeAvail = onSnapshot(doc(db, COLLECTIONS.AVAILABILITY, availDocId), (snapshot) => {
      setAvailabilityDoc(snapshot.exists() ? snapshot.data() : null);
    });

    // 5. Week Availability Listener
    const today = new Date();
    const next7Days = Array.from({ length: 7 }, (_, i) => format(addDays(today, i), 'yyyy-MM-dd'));
    const weekQuery = query(
      collection(db, COLLECTIONS.AVAILABILITY),
      where('userId', '==', currentUser.uid),
      where('date', 'in', next7Days)
    );
    const unsubscribeWeek = onSnapshot(weekQuery, (snapshot) => {
      const availMap: Record<string, any> = {};
      snapshot.forEach(d => {
        availMap[d.data().date] = d.data();
      });
      setWeekAvailability(availMap);
    });

    setIsLoading(false);
    return () => {
      unsubscribeRoute();
      unsubscribeRide();
      unsubscribeFee();
      unsubscribeAvail();
      unsubscribeWeek();
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

  const getDayStatusColor = (dateStr: string) => {
    const avail = weekAvailability[dateStr];
    const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
    if (avail?.isAvailable === true) return '#16A34A';
    if (avail?.isAvailable === false) return '#DC2626';
    if (isToday) return COLORS.primary;
    return '#E5E7EB';
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
          <View style={styles.centered}><ActivityIndicator color={COLORS.primary} /></View>
      ) : (
        <ScrollView 
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* ── Header ── */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.greeting}>{getGreeting()},</Text>
                        <Text style={styles.userName}>{currentUser?.fullName?.split(' ')[0]}</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('ProfileTab' as any)}>
                        {currentUser?.profileImageUrl ? (
                            <Avatar.Image size={44} source={{ uri: currentUser.profileImageUrl }} />
                        ) : (
                            <Avatar.Text size={44} label={currentUser?.fullName?.[0] || 'U'} style={{ backgroundColor: COLORS.accent }} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Stats Row ── */}
            <View style={styles.statsRow}>
                <View style={styles.statsCol}>
                    <Text style={styles.statsValue} numberOfLines={1}>
                        {myRoute?.routeName ? (myRoute.routeName.split(' —')[0] || myRoute.routeName.split(' -')[0]) : '—'}
                    </Text>
                    <Text style={styles.statsLabel}>Route</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statsCol}>
                    <Text style={styles.statsValue} numberOfLines={1}>
                        {currentUser?.pickupStop ? currentUser.pickupStop.split(' ')[0] : '—'}
                    </Text>
                    <Text style={styles.statsLabel}>Pickup</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statsCol}>
                    <Text style={[
                        styles.statsValue, 
                        { color: feeStatus === 'verified' ? '#16A34A' : (feeStatus === 'submitted' ? '#F59E0B' : '#DC2626') }
                    ]}>
                        {feeStatus === 'verified' ? 'Paid' : (feeStatus === 'submitted' ? 'Review' : 'Due')}
                    </Text>
                    <Text style={styles.statsLabel}>Fee</Text>
                </View>
            </View>

            {/* ── Quick Status Cards ── */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickCardsScroll}>
                {/* Availability Mini Card */}
                {availabilityDoc === null ? (
                    <TouchableOpacity 
                        style={[styles.miniCard, styles.notMarkedCard]}
                        onPress={() => navigation.navigate('StudentAvailability')}
                    >
                        <View style={styles.miniCardHeader}>
                            <MaterialCommunityIcons name="calendar-today" size={16} color="#F59E0B" />
                            <Text style={[styles.miniCardTitle, { color: '#92400E' }]}>Availability</Text>
                        </View>
                        <Text style={styles.notMarkedText}>Tap to mark</Text>
                        <View style={styles.miniDot} />
                    </TouchableOpacity>
                ) : availabilityDoc.isAvailable ? (
                    <TouchableOpacity 
                        style={[styles.miniCard, styles.availableCard]}
                        onPress={() => navigation.navigate('StudentAvailability')}
                    >
                        <View style={styles.miniCardHeader}>
                            <MaterialCommunityIcons name="calendar-check" size={16} color="#16A34A" />
                            <Text style={[styles.miniCardTitle, { color: '#16A34A' }]}>Availability</Text>
                        </View>
                        <View style={styles.miniCardStatusRow}>
                            <MaterialCommunityIcons name="check-circle" size={18} color="#16A34A" />
                            <Text style={[styles.miniCardStatus, { color: '#16A34A' }]}>Available</Text>
                        </View>
                        <Text style={styles.miniCardSub}>Transport confirmed</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity 
                        style={[styles.miniCard, styles.unavailableCard]}
                        onPress={() => navigation.navigate('StudentAvailability')}
                    >
                        <View style={styles.miniCardHeader}>
                            <MaterialCommunityIcons name="close-circle" size={16} color="#DC2626" />
                            <Text style={[styles.miniCardTitle, { color: '#DC2626' }]}>Availability</Text>
                        </View>
                        <Text style={[styles.miniCardStatus, { color: '#DC2626', marginTop: 6 }]}>Not Available</Text>
                        <Text style={styles.miniCardSub}>Driver notified</Text>
                    </TouchableOpacity>
                )}

                {/* My Route Mini Card */}
                <TouchableOpacity style={[styles.miniCard, styles.whiteMiniCard]} onPress={() => navigation.navigate('MyRouteTab' as any)}>
                    <View style={styles.miniCardHeader}>
                        <MaterialCommunityIcons name="map-marker-path" size={16} color={COLORS.primary} />
                        <Text style={[styles.miniCardTitle, { color: COLORS.primary }]}>My Route</Text>
                    </View>
                    <Text style={styles.routeText} numberOfLines={1}>{myRoute?.routeName ? (myRoute.routeName.split(' —')[0] || myRoute.routeName.split(' -')[0]) : 'No Route'}</Text>
                    <Text style={styles.miniCardSub}>View details</Text>
                </TouchableOpacity>

                {/* Fee Mini Card */}
                <TouchableOpacity 
                    style={[
                        styles.miniCard, 
                        feeStatus === 'verified' ? styles.availableCard : 
                        (feeStatus === 'submitted' ? styles.notMarkedCard : styles.unavailableCard)
                    ]} 
                    onPress={() => navigation.navigate('FeePayment' as any)}
                >
                    <View style={styles.miniCardHeader}>
                        <MaterialCommunityIcons 
                            name={feeStatus === 'verified' ? "credit-card-check" : (feeStatus === 'submitted' ? "clock-outline" : "credit-card-remove")} 
                            size={16} 
                            color={feeStatus === 'verified' ? "#16A34A" : (feeStatus === 'submitted' ? "#F59E0B" : "#DC2626")} 
                        />
                        <Text style={[styles.miniCardTitle, { color: feeStatus === 'verified' ? "#16A34A" : (feeStatus === 'submitted' ? "#92400E" : "#DC2626") }]}>
                            Monthly Fee
                        </Text>
                    </View>
                    <Text style={[styles.miniCardStatus, { color: feeStatus === 'verified' ? "#16A34A" : (feeStatus === 'submitted' ? "#92400E" : "#DC2626"), marginTop: 6 }]}>
                        {feeStatus === 'verified' ? 'Paid ✓' : (feeStatus === 'submitted' ? 'Under Review' : 'Fee Due')}
                    </Text>
                    <Text style={styles.miniCardSub}>
                        {feeStatus === 'verified' ? format(new Date(), 'MMMM') : (feeStatus === 'submitted' ? 'Admin verifying' : 'Tap to pay')}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {/* ── Today's Ride Section ── */}
            {todayRide && (
                <View style={styles.sectionPadding}>
                    <Text style={styles.sectionTitle}>Today's Ride</Text>
                    <Card style={styles.rideCard} elevation={2}>
                        <View style={styles.rideCardContent}>
                            <View style={styles.rideHeaderRow}>
                                <MaterialCommunityIcons name="bus" size={20} color={COLORS.primary} />
                                <Text style={styles.rideRouteName}>{todayRide.routeName}</Text>
                            </View>
                            <View style={styles.rideInfoGrid}>
                                <View style={styles.rideInfoItem}>
                                    <MaterialCommunityIcons name="clock-outline" size={14} color={COLORS.textSecondary} />
                                    <Text style={styles.rideInfoText}>{todayRide.departureTime}</Text>
                                </View>
                                <View style={styles.rideInfoItem}>
                                    <MaterialCommunityIcons name="account" size={14} color={COLORS.textSecondary} />
                                    <Text style={styles.rideInfoText}>{todayRide.driverName}</Text>
                                </View>
                            </View>
                            <Button 
                                mode="contained" 
                                style={styles.trackBtn} 
                                buttonColor={COLORS.primary}
                                onPress={() => navigation.navigate('TrackRide', { rideId: todayRide.id })}
                            >
                                Track Ride →
                            </Button>
                        </View>
                    </Card>
                </View>
            )}

            {/* ── Upcoming Availability Section ── */}
            <View style={styles.sectionPadding}>
                <Text style={styles.sectionTitle}>This Week</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                    {Array.from({ length: 7 }, (_, i) => {
                        const date = addDays(new Date(), i);
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const dayName = format(date, 'EEE');
                        const dayNum = format(date, 'd');
                        const statusColor = getDayStatusColor(dateStr);
                        
                        return (
                            <View key={i} style={[styles.dayChip, { borderColor: statusColor, borderWidth: statusColor === '#E5E7EB' ? 1 : 1.5 }]}>
                                <Text style={styles.dayLabel}>{dayName}</Text>
                                <Text style={[styles.dayNum, { color: statusColor === '#E5E7EB' ? COLORS.text : statusColor }]}>{dayNum}</Text>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#1A3C5E', padding: 20, paddingTop: 50 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 13, color: 'white', opacity: 0.8 },
  userName: { fontSize: 20, fontWeight: '700', color: 'white', marginTop: 2 },
  statsRow: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#F3F4F6', alignItems: 'center' },
  statsCol: { flex: 1, alignItems: 'center' },
  statsValue: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
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
  notMarkedText: { fontSize: 13, color: '#92400E', marginTop: 6 },
  miniDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B', marginTop: 4 },
  miniCardSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  routeText: { fontSize: 13, fontWeight: '500', color: COLORS.text, marginTop: 6 },
  sectionPadding: { paddingHorizontal: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 10, marginTop: 10 },
  rideCard: { backgroundColor: 'white', borderRadius: 12, overflow: 'hidden' },
  rideCardContent: { padding: 16 },
  rideHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  rideRouteName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  rideInfoGrid: { gap: 6, marginBottom: 14 },
  rideInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rideInfoText: { fontSize: 13, color: COLORS.textSecondary },
  trackBtn: { borderRadius: 8, paddingVertical: 4 },
  chipsRow: { gap: 10, paddingBottom: 10 },
  dayChip: { width: 40, height: 56, borderRadius: 10, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  dayLabel: { fontSize: 10, color: COLORS.textSecondary, textTransform: 'uppercase' },
  dayNum: { fontSize: 14, fontWeight: '600', marginTop: 2 },
});

export default StudentHomeScreen;
