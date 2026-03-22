import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { doc, getDoc, updateDoc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@hooks/useAuth';
import { COLORS, SPACING } from '@constants/theme';
import { Route, Ride } from '@types';
import { getPakistanTodayString } from '@utils/dateHelpers';

export const ActiveRideScreen: React.FC<any> = ({ route, navigation }) => {
  const { rideId, routeId } = (route.params || {}) as { rideId: string; routeId: string };
  const { currentUser } = useAuth();
  const availCleanupRef = useRef<(() => void) | null>(null);

  if (!route.params?.rideId || !route.params?.routeId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <MaterialCommunityIcons name="bus-clock" size={64} color="#D1D5DB" />
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 }}>
          No Active Ride
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
          Start a ride from the Home screen to begin tracking
        </Text>
      </View>
    );
  }

  const [ride, setRide] = useState<Ride | null>(null);
  const [routeData, setRouteData] = useState<Route | null>(null);
  const [driverLocation, setDriverLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [reachedStops, setReachedStops] = useState<string[]>([]);
  const [todayAvailableCount, setTodayAvailableCount] = useState(0);

  const locationSubscriber = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeRide = async () => {
      try {
        // 1. Fetch Route document for stops and coordinates
        const routeRef = doc(db, COLLECTIONS.ROUTES, routeId);
        const routeSnap = await getDoc(routeRef);
        if (routeSnap.exists() && isMounted) {
          setRouteData(routeSnap.data() as Route);
        }

        // 2. Fetch Ride document
        const rideRef = doc(db, COLLECTIONS.RIDES, rideId);
        const rideSnap = await getDoc(rideRef);

        if (!rideSnap.exists() && isMounted) {
          Alert.alert('Error', 'Ride not found');
          navigation.goBack();
          return;
        }

        const rideData = rideSnap.data() as Ride;
        if (isMounted) setRide(rideData);

        // 3. Set status to active
        if (rideData.status === 'scheduled') {
          await updateDoc(rideRef, { status: 'active' });
        }

        // 4. Real-time aboard count listener
        const rdSnap = routeSnap.exists() ? routeSnap.data() : null;
        if (rdSnap) {
          const studentIds = rdSnap.studentIds || [];
          const todayStr = getPakistanTodayString();
          const boardedMap: Record<string, boolean> = {};

          const availUnsubscribers: (() => void)[] = [];
          studentIds.forEach((sid: string) => {
            const availDocId = sid + '_' + todayStr;
            const unsub = onSnapshot(
              doc(db, COLLECTIONS.AVAILABILITY, availDocId),
              (snap) => {
                if (snap.exists()) {
                  const data = snap.data();
                  boardedMap[sid] = data.boarded === true;
                } else {
                  boardedMap[sid] = false;
                }
                const count = Object.values(boardedMap).filter(Boolean).length;
                if (isMounted) setTodayAvailableCount(count);
              }
            );
            availUnsubscribers.push(unsub);
          });

          // Store cleanup in a ref to call on unmount
          availCleanupRef.current = () => availUnsubscribers.forEach(fn => fn());
        }

        // 5. Request Location Permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('Location permission status:', status);
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to track the ride. Please enable it in your phone settings.');
          navigation.goBack();
          return;
        }

        // 6. Start Location Watcher
        locationSubscriber.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 5,
          },
          async (location) => {
            const coords = location.coords;
            console.log('New location received:', coords.latitude, coords.longitude);
            if (isMounted) setDriverLocation(coords);

            if (currentUser?.uid && rideId) {
              try {
                await setDoc(doc(db, COLLECTIONS.LIVE_LOCATIONS, rideId), {
                  driverId: currentUser.uid,
                  rideId,
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  heading: coords.heading,
                  speed: coords.speed,
                  updatedAt: serverTimestamp()
                }, { merge: true });
                console.log('Location written to Firestore successfully');
                console.log('setDoc success');
              } catch (error) {
                console.error('setDoc failed:', error);
              }
            }
          }
        );
        console.log('Location watcher started successfully');
      } catch (error) {
        console.error('Error initializing ride:', error);
      }
    };

    initializeRide();

    return () => {
      isMounted = false;
      if (locationSubscriber.current) {
        locationSubscriber.current.remove();
        locationSubscriber.current = null;
      }
      if (availCleanupRef.current) {
        availCleanupRef.current();
      }
    };
  }, [rideId, routeId, navigation, currentUser?.uid]);

  const handleMarkReached = (stopName: string) => {
    if (!reachedStops.includes(stopName)) {
      setReachedStops([...reachedStops, stopName]);
    }
  };

  const handleEndRide = () => {
    Alert.alert(
      'End Ride',
      'Are you sure you want to end this ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Stop location watcher
              if (locationSubscriber.current) {
                locationSubscriber.current.remove();
                locationSubscriber.current = null;
              }

              // Calculate final boarded count
              let finalBoardedCount = 0;
              if (routeData?.studentIds && ride?.date) {
                const availPromises = routeData.studentIds.map((sid: string) => 
                  getDoc(doc(db, COLLECTIONS.AVAILABILITY, `${sid}_${ride.date}`))
                );
                const availDocs = await Promise.all(availPromises);
                finalBoardedCount = availDocs.filter((d: any) => d.exists() && d.data().boarded === true).length;
              }

              // 2. Update ride status and save boardedCount
              await updateDoc(doc(db, COLLECTIONS.RIDES, rideId), { 
                status: 'completed',
                boardedCount: finalBoardedCount 
              });

              // 3. Delete live location
              await deleteDoc(doc(db, COLLECTIONS.LIVE_LOCATIONS, rideId));

              // 4. Navigate to summary
              navigation.replace('RideSummary', { rideId });
            } catch (error) {
              console.error('Error ending ride:', error);
              Alert.alert('Error', 'Failed to end ride. Please check network connection.');
            }
          }
        }
      ]
    );
  };

  if (!ride) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons name="bus-clock" size={48} color={COLORS.textSecondary} />
        <Text style={styles.loadingText}>Loading ride...</Text>
      </View>
    );
  }

  const stops = routeData?.stops || ride.stops || [];
  const stopCoordinates = stops
    .filter((s: any) => s.coordinates)
    .sort((a: any, b: any) => a.order - b.order)
    .map((s: any) => ({
      latitude: s.coordinates.latitude,
      longitude: s.coordinates.longitude,
    }));

  const getMapRegion = () => {
    if (driverLocation) {
      return {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    if (stopCoordinates.length > 0) {
      return {
        latitude: stopCoordinates[0].latitude,
        longitude: stopCoordinates[0].longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return {
      latitude: 33.6844,
      longitude: 73.0479,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={getMapRegion()}
      >
        {/* Driver Marker — Custom bus icon */}
        {driverLocation && (
          <Marker
            coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }}
            title="Driver"
          >
            <View style={styles.driverMarkerContainer}>
              <MaterialCommunityIcons name="bus" size={20} color="white" />
            </View>
          </Marker>
        )}

        {/* Stop Markers — Numbered circles */}
        {stops
          .filter((s: any) => s.coordinates)
          .sort((a: any, b: any) => a.order - b.order)
          .map((stop: any, i: number) => (
            <Marker
              key={i}
              coordinate={{ latitude: stop.coordinates.latitude, longitude: stop.coordinates.longitude }}
              title={stop.stopName}
            >
              <View style={styles.stopMarker}>
                <Text style={styles.stopMarkerText}>{i + 1}</Text>
              </View>
            </Marker>
          ))
        }

        {/* Polyline through stops */}
        {stopCoordinates.length > 1 && (
          <Polyline
            coordinates={stopCoordinates}
            strokeColor={COLORS.primary}
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        {/* Handle bar */}
        <View style={styles.handleBar} />

        {/* Header row */}
        <View style={styles.panelHeader}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="bus" size={18} color={COLORS.primary} />
            <Text style={styles.routeNameText}>{routeData?.routeName || ride.routeName}</Text>
          </View>
          <View style={styles.passengerBadge}>
            <Text style={styles.passengerCountText}>{todayAvailableCount} aboard</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Stops section */}
        <View style={styles.stopsSection}>
          <Text style={styles.sectionHeader}>Route Stops</Text>
          <ScrollView 
            style={styles.stopsScrollView}
            showsVerticalScrollIndicator={false}
          >
            {stops
              .sort((a: any, b: any) => a.order - b.order)
              .map((stop: any, i: number) => {
                const isReached = reachedStops.includes(stop.stopName);
                const isLast = i === stops.length - 1;
                return (
                  <View key={i} style={styles.stopRow}>
                    {/* Left side: Indicator */}
                    <View style={styles.indicatorContainer}>
                      <View style={[
                        styles.stopIndicator,
                        isReached ? styles.stopIndicatorReached : styles.stopIndicatorPending
                      ]}>
                        <Text style={[
                          styles.stopOrder,
                          { color: isReached ? 'white' : '#6B7280' }
                        ]}>
                          {i + 1}
                        </Text>
                      </View>
                      {!isLast && <View style={styles.verticalLine} />}
                    </View>

                    {/* Middle: Stop Name */}
                    <Text style={styles.stopNameText}>{stop.stopName}</Text>

                    {/* Right: Action */}
                    <View>
                      {isReached ? (
                        <View style={styles.reachedBadge}>
                          <MaterialCommunityIcons name="check-circle" size={16} color="#16A34A" />
                          <Text style={styles.reachedText}>Reached</Text>
                        </View>
                      ) : (
                        <TouchableOpacity 
                          style={styles.markButton}
                          onPress={() => handleMarkReached(stop.stopName)}
                        >
                          <Text style={styles.markButtonText}>Mark</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
          </ScrollView>
        </View>

        <View style={[styles.divider, { marginHorizontal: 16 }]} />

        {/* Bottom buttons row */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.passengersBtn}
            onPress={() => navigation.navigate('Passengers', {
              rideId: rideId,
              routeId: routeId
            })}
          >
            <MaterialCommunityIcons name="account-group" size={16} color={COLORS.primary} />
            <Text style={styles.passengersBtnText}>Passengers</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.endBtn} onPress={handleEndRide}>
            <MaterialCommunityIcons name="stop-circle" size={16} color="white" />
            <Text style={styles.endBtnText}>End Ride</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  map: { flex: 1 },
  driverMarkerContainer: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  stopMarker: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    elevation: 3,
  },
  stopMarkerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 20,
    maxHeight: '62%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -5 },
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  passengerBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  passengerCountText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  stopsSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  stopsScrollView: {
    maxHeight: 160,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  indicatorContainer: {
    alignItems: 'center',
    width: 28,
  },
  stopIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIndicatorReached: {
    backgroundColor: '#16A34A',
  },
  stopIndicatorPending: {
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  stopOrder: {
    fontSize: 12,
    fontWeight: '700',
  },
  verticalLine: {
    position: 'absolute',
    left: 13,
    top: 28,
    width: 2,
    height: 12,
    backgroundColor: '#E5E7EB',
  },
  stopNameText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 10,
    flex: 1,
  },
  markButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  markButtonText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  reachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reachedText: {
    fontSize: 12,
    color: '#16A34A',
  },
  buttonRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
  },
  passengersBtn: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  passengersBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  endBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  endBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ActiveRideScreen;
