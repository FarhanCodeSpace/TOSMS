import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from '@hooks/useAuth';
import { COLORS, SPACING } from '@constants/theme';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Route, User, RideStop } from '../../types';
import { format } from 'date-fns';
import { StackNavigationProp } from '@react-navigation/stack';
import { StudentHomeStackParamList } from '@navigation/types';
import LoadingSpinner from '@components/common/LoadingSpinner';
import AvatarComponent from '@components/common/Avatar';
import { formatPKR } from '@utils/formatters';

type MyRouteScreenProps = {
  navigation: StackNavigationProp<StudentHomeStackParamList, 'MyRoute'>;
};

const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <MaterialCommunityIcons name="map-marker-off" size={64} color={COLORS.textSecondary} opacity={0.3} />
    <Text style={styles.emptyTitle}>No Route Assigned</Text>
    <Text style={styles.emptySub}>Admin will assign you to a route soon.</Text>
  </View>
);

const MyRouteScreen: React.FC<MyRouteScreenProps> = ({ navigation }) => {
  const { currentUser } = useAuth();
  const mapRef = useRef<MapView>(null);
  
  const [route, setRoute] = useState<Route | null>(null);
  const [driver, setDriver] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableCount, setAvailableCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!currentUser?.routeId) {
        setIsLoading(false);
        return;
      }
      const auth = getAuth();

      const cleanups: (() => void)[] = [];

      // 1. Route Listener
      const unsubRoute = onSnapshot(
        doc(db, COLLECTIONS.ROUTES, currentUser.routeId),
        async (docSnap) => {
          if (!auth.currentUser) return;
          if (docSnap.exists()) {
            const routeData = {
              routeId: docSnap.id,
              ...docSnap.data(),
            } as Route;
            setRoute(routeData);

            // Fetch Driver Info
            if (routeData.assignedDriverId) {
              try {
                const driverDoc = await getDoc(
                  doc(db, COLLECTIONS.USERS, routeData.assignedDriverId),
                );
                if (driverDoc.exists() && auth.currentUser) {
                  setDriver(driverDoc.data() as User);
                }
              } catch {
              // silently handle driver fetch error
              }
            }
          }
          setIsLoading(false);
        },
        (error: any) => {
          if (error.code === "permission-denied") return;
          setIsLoading(false);
        },
      );
      cleanups.push(unsubRoute);

      // 2. Availability Count Listener
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const q = query(
        collection(db, COLLECTIONS.AVAILABILITY),
        where("routeId", "==", currentUser.routeId),
        where("date", "==", todayStr),
        where("role", "==", "student"),
        where("isAvailable", "==", true),
      );

      const unsubAvail = onSnapshot(
        q,
        (snapshot) => {
          if (!auth.currentUser) return;
          setAvailableCount(snapshot.size);
        },
        (error: any) => {
          if (error.code === "permission-denied") return;
        },
      );
      cleanups.push(unsubAvail);

      return () => {
        cleanups.forEach((fn) => fn());
      };
    }, [currentUser?.routeId])
  );

  const handlePhonePress = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

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

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>My Route</Text>
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
            <Text style={styles.sectionTitle}>Route Stops</Text>
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

        {/* ── Driver Info ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="steering" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Assigned Driver</Text>
          </View>
          {driver ? (
            <Card style={styles.driverCard} elevation={0}>
              <View style={styles.driverRow}>
                <View style={styles.avatarContainer}>
                  <AvatarComponent
                    imageUrl={driver.profileImageUrl}
                    name={driver.fullName}
                    size={56}
                  />
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{driver.fullName}</Text>
                  <View style={styles.phoneRow}>
                    <MaterialCommunityIcons name="phone" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.driverPhone}>{driver.phone}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.callCircle}
                  onPress={() => handlePhonePress(driver.phone)}
                >
                  <MaterialCommunityIcons name="phone" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </Card>
          ) : (
            <View style={styles.noDriverBox}>
              <Text style={styles.noDriverText}>No driver assigned yet.</Text>
            </View>
          )}
        </View>

        {/* ── Route Details ── */}
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="information-outline" size={20} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Route Details</Text>
            </View>
            <View style={styles.detailsRow}>
                <View style={styles.detailBox}>
                    <MaterialCommunityIcons name="bus-clock" size={22} color={COLORS.primary} />
                    <Text style={styles.detailLabel}>Departs</Text>
                    <Text style={styles.detailValue}>{route.departureTime}</Text>
                </View>
                <View style={styles.detailBox}>
                    <MaterialCommunityIcons name="clock-end" size={22} color={COLORS.primary} />
                    <Text style={styles.detailLabel}>Returns</Text>
                    <Text style={styles.detailValue}>{route.returnTime || '—'}</Text>
                </View>
                <View style={styles.detailBox}>
                    <MaterialCommunityIcons name="cash" size={22} color={COLORS.primary} />
                    <Text style={styles.detailLabel}>Monthly Fee</Text>
                    <Text style={styles.detailValue}>{formatPKR(route.feeAmount || 0)}</Text>
                </View>
            </View>
        </View>

        {/* ── Today's Presence ── */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-group-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Today's Presence</Text>
          </View>
          <Card style={styles.presenceCard} elevation={0}>
            <View style={styles.presenceRow}>
                <View style={styles.presenceIconBg}>
                    <MaterialCommunityIcons name="bus-marker" size={24} color="#16A34A" />
                </View>
                <View style={styles.presenceInfo}>
                    <Text style={styles.presenceTitle}>
                        {availableCount} <Text style={styles.presenceTotal}>/ {route.studentIds?.length || 0}</Text>
                    </Text>
                    <Text style={styles.presenceSub}>Students using transport today</Text>
                </View>
            </View>
          </Card>
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
  mapCard: { height: 180, margin: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E5E7EB', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
  map: { width: '100%', height: '100%' },
  customMarker: { backgroundColor: COLORS.primary, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  markerIndex: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  timelineContainer: { backgroundColor: 'white', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F3F4F6', elevation: 1 },
  timelineItem: { flexDirection: 'row', minHeight: 60 },
  timelineLabel: { width: 30, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D1D5DB', marginTop: 6, zIndex: 2 },
  firstDot: { backgroundColor: COLORS.primary, width: 12, height: 12, borderRadius: 6 },
  timelineLine: { position: 'absolute', top: 16, width: 2, height: '100%', backgroundColor: '#F3F4F6', zIndex: 1 },
  timelineContent: { flex: 1, paddingLeft: 12, paddingBottom: 20 },
  stopText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  stopMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  driverCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6', elevation: 1 },
  driverRow: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { position: 'relative' },
  driverInfo: { flex: 1, marginLeft: 16 },
  driverName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  driverPhone: { fontSize: 13, color: COLORS.textSecondary },
  callCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  noDriverBox: { backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center', borderStyle: 'dotted', borderWidth: 2, borderColor: '#D1D5DB' },
  noDriverText: { color: COLORS.textSecondary, fontSize: 13 },
  detailsRow: { flexDirection: 'row', gap: 12 },
  detailBox: { flex: 1, backgroundColor: 'white', padding: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', elevation: 1 },
  detailLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 6, textTransform: 'uppercase' },
  detailValue: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginTop: 2 },
  presenceCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6', elevation: 1 },
  presenceRow: { flexDirection: 'row', alignItems: 'center' },
  presenceIconBg: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F0FFF4', justifyContent: 'center', alignItems: 'center' },
  presenceInfo: { marginLeft: 16 },
  presenceTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  presenceTotal: { fontSize: 14, color: COLORS.textSecondary, fontWeight: 'normal' },
  presenceSub: { fontSize: 12, color: '#16A34A', marginTop: 2 },
  lastSection: { paddingBottom: 50 },
});

export default MyRouteScreen;
