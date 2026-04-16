import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text, Card } from 'react-native-paper';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@hooks/useAuth';
import { COLORS, SPACING } from '@constants/theme';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Route, User, RideStop } from '../../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { DriverHomeStackParamList } from '@navigation/types';
import LoadingSpinner from '@components/common/LoadingSpinner';
import AvatarComponent from '@components/common/Avatar';

type DriverMyRouteScreenProps = {
  navigation: StackNavigationProp<DriverHomeStackParamList, 'DriverHome'>;
};

type StudentWithAvailability = User & {
  availabilityStatus: 'available' | 'unavailable' | 'no-response';
};

const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <MaterialCommunityIcons name="map-marker-off" size={64} color={COLORS.textSecondary} opacity={0.3} />
    <Text style={styles.emptyTitle}>No Route Assigned</Text>
    <Text style={styles.emptySub}>Admin will assign you a route shortly.</Text>
  </View>
);

export const DriverMyRouteScreen: React.FC<DriverMyRouteScreenProps> = ({ navigation }) => {
  const { currentUser } = useAuth();
  const mapRef = useRef<MapView>(null);
  
  const [route, setRoute] = useState<Route | null>(null);
  const [baseStudents, setBaseStudents] = useState<User[]>([]);
  const [students, setStudents] = useState<StudentWithAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRouteData();
  }, [currentUser?.uid]);

  const fetchRouteData = async () => {
    if (!currentUser?.uid) return;

    try {
      const rQuery = query(
        collection(db, COLLECTIONS.ROUTES),
        where('assignedDriverId', '==', currentUser.uid)
      );
      const rSnap = await getDocs(rQuery);
      
      if (!rSnap.empty) {
        const routeData = { routeId: rSnap.docs[0].id, ...rSnap.docs[0].data() } as Route;
        setRoute(routeData);

        if (routeData.studentIds && routeData.studentIds.length > 0) {
          const studentPromises = routeData.studentIds.map((id: string) => getDoc(doc(db, COLLECTIONS.USERS, id)));
          const studentDocs = await Promise.all(studentPromises);
          
          const studentsData: User[] = studentDocs
            .filter((d: any) => d.exists())
            .map((d: any) => d.data() as User);

          setBaseStudents(studentsData);
        }
      }
    } catch {
      // silently handle error
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (baseStudents.length === 0) return;
      const auth = getAuth();
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const unsubscribes: (() => void)[] = [];
      const statusMap = new Map<string, 'available' | 'unavailable' | 'no-response'>();

      const updateStudents = () => {
        if (!auth.currentUser) return;
        setStudents(baseStudents.map(student => ({
          ...student,
          availabilityStatus: statusMap.get(student.uid) || 'no-response'
        })));
      };

      baseStudents.forEach(student => {
        const availDocId = student.uid + '_' + tomorrowStr;
        const docRef = doc(db, COLLECTIONS.AVAILABILITY, availDocId);

        const unsub = onSnapshot(
          docRef, 
          (docSnap) => {
            if (!auth.currentUser) return;
            if (docSnap.exists()) {
              const isAvail = docSnap.data().isAvailable;
              statusMap.set(student.uid, isAvail ? 'available' : 'unavailable');
            } else {
              statusMap.set(student.uid, 'no-response');
            }
            updateStudents();
          },
          (error: any) => {
            if (error.code === 'permission-denied') return;
          }
        );

        unsubscribes.push(unsub);
      });

      return () => {
        unsubscribes.forEach(unsub => unsub());
      };
    }, [baseStudents])
  );

  const fitMapToMarkers = () => {
    if (mapRef.current && route?.stops && route.stops.length > 0) {
      const coords = route.stops.map(s => s.coordinates);
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!route) {
    return <EmptyState />;
  }

  const counts = {
    available: students.filter(s => s.availabilityStatus === 'available').length,
    unavailable: students.filter(s => s.availabilityStatus === 'unavailable').length,
    notResponded: students.filter(s => s.availabilityStatus === 'no-response').length,
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Active Route</Text>
        <Text style={styles.headerTitle}>{route.routeName}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Map Section ── */}
        {route.stops && route.stops.length > 0 && (
          <View style={styles.mapCard}>
            <MapView
              ref={mapRef}
              style={styles.map}
              onLayout={fitMapToMarkers}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              {route.stops.map((stop: RideStop, index: number) => (
                <Marker
                  key={`stop-${index}`}
                  coordinate={stop.coordinates as import('react-native-maps').LatLng}
                >
                  <View style={styles.customMarker}>
                    <Text style={styles.markerIndex}>{stop.order}</Text>
                  </View>
                </Marker>
              ))}
              
              <Polyline
                coordinates={route.stops.map((s: RideStop) => s.coordinates as import('react-native-maps').LatLng)}
                strokeColor={COLORS.primary}
                strokeWidth={3}
              />
            </MapView>
          </View>
        )}

        {/* ── Timeline Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="map-clock-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Route Timeline</Text>
          </View>
          
          <View style={styles.timelineContainer}>
            {route.stops.sort((a,b) => a.order - b.order).map((stop: RideStop, index: number) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineLabel}>
                  <View style={[styles.timelineDot, index === 0 && styles.firstDot]} />
                  {index < route.stops.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.stopText}>{stop.stopName}</Text>
                  <Text style={styles.stopMeta}>Stop {stop.order}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Students Section ── */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-group-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Passengers</Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryItem, { borderColor: '#E8F5E9' }]}>
              <Text style={[styles.summaryCount, { color: '#16A34A' }]}>{counts.available}</Text>
              <Text style={styles.summaryLabel}>Available</Text>
            </View>
            <View style={[styles.summaryItem, { borderColor: '#FFEBEE' }]}>
              <Text style={[styles.summaryCount, { color: '#DC2626' }]}>{counts.unavailable}</Text>
              <Text style={styles.summaryLabel}>Absent</Text>
            </View>
            <View style={[styles.summaryItem, { borderColor: '#F5F5F5' }]}>
              <Text style={[styles.summaryCount, { color: COLORS.textSecondary }]}>{counts.notResponded}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
          </View>

          {students.map((student) => (
            <Card key={student.uid} style={styles.passengerCard} elevation={0}>
              <View style={styles.passengerRow}>
                <View style={styles.avatarContainer}>
                  <AvatarComponent
                    imageUrl={student.profileImageUrl}
                    name={student.fullName}
                    size={48}
                  />
                  <View style={[styles.statusIndicator, { backgroundColor: student.availabilityStatus === 'available' ? '#16A34A' : (student.availabilityStatus === 'unavailable' ? '#DC2626' : '#9CA3AF') }]} />
                </View>
                
                <View style={styles.passengerInfo}>
                  <Text style={styles.passengerName}>{student.fullName}</Text>
                  <View style={styles.stopInfo}>
                    <MaterialCommunityIcons name="map-marker" size={12} color={COLORS.textSecondary} />
                    <Text style={styles.passengerStop}>{student.pickupStop || "No stop assigned"}</Text>
                  </View>
                </View>
                
                <View style={[
                  styles.statusBadge, 
                  student.availabilityStatus === 'available' ? styles.bgSuccess : (student.availabilityStatus === 'unavailable' ? styles.bgError : styles.bgPending)
                ]}>
                  <MaterialCommunityIcons 
                    name={student.availabilityStatus === 'available' ? "check" : (student.availabilityStatus === 'unavailable' ? "close" : "clock-outline")} 
                    size={14} 
                    color={student.availabilityStatus === 'available' ? '#16A34A' : (student.availabilityStatus === 'unavailable' ? '#DC2626' : COLORS.textSecondary)} 
                  />
                </View>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: COLORS.primary, padding: 24, paddingTop: 60 },
  headerLabel: { color: 'white', opacity: 0.7, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '700', marginTop: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 16 },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
  mapCard: { height: 200, margin: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E5E7EB' },
  map: { width: '100%', height: '100%' },
  customMarker: { backgroundColor: COLORS.primary, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  markerIndex: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  section: { paddingHorizontal: 20, marginTop: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  timelineContainer: { backgroundColor: 'white', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' },
  timelineItem: { flexDirection: 'row', minHeight: 60 },
  timelineLabel: { width: 30, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D1D5DB', marginTop: 6, zIndex: 2 },
  firstDot: { backgroundColor: COLORS.primary, width: 12, height: 12, borderRadius: 6 },
  timelineLine: { position: 'absolute', top: 16, width: 2, height: '100%', backgroundColor: '#F3F4F6', zIndex: 1 },
  timelineContent: { flex: 1, paddingLeft: 12, paddingBottom: 20 },
  stopText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  stopMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryItem: { flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  summaryCount: { fontSize: 18, fontWeight: '700' },
  summaryLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, textTransform: 'uppercase' },
  passengerCard: { marginBottom: 10, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  passengerRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  avatarContainer: { position: 'relative' },
  statusIndicator: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: 'white' },
  passengerInfo: { flex: 1, marginLeft: 16 },
  passengerName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  stopInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  passengerStop: { fontSize: 12, color: COLORS.textSecondary },
  statusBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  bgSuccess: { backgroundColor: '#F0FFF4' },
  bgError: { backgroundColor: '#FFF5F5' },
  bgPending: { backgroundColor: '#F9FAFB' },
  lastSection: { paddingBottom: 40 },
});

export default DriverMyRouteScreen;
