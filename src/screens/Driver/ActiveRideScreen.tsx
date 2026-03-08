import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, IconButton, useTheme } from 'react-native-paper';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { doc, getDoc, updateDoc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@hooks/useAuth';
import { COLORS, SPACING } from '@constants/theme';
import { StackScreenProps } from '@react-navigation/stack';
import { DriverActiveRideStackParamList } from '@navigation/types';
import { Ride } from '@types';

type ActiveRideScreenProps = StackScreenProps<DriverActiveRideStackParamList, 'ActiveRide'>;

// HOC pattern for typing where route.params is used, since 'ActiveRide' usually didn't have params
// but we'll accept it via props directly or infer it if passed incorrectly.
export const ActiveRideScreen: React.FC<any> = ({ route, navigation }) => {
  const passedRideId = route.params?.rideId;
  const { currentUser } = useAuth();
  
  const [rideId, setRideId] = useState<string | null>(passedRideId || null);
  const [isSearchingActive, setIsSearchingActive] = useState(!passedRideId);
  const [ride, setRide] = useState<Ride | null>(null);
  const [driverLocation, setDriverLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [reachedStops, setReachedStops] = useState<string[]>([]);
  
  const locationSubscriber = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (passedRideId) {
      setRideId(passedRideId);
      setIsSearchingActive(false);
      return;
    }

    const findActiveRide = async () => {
      if (!currentUser?.uid) return;
      try {
        const q = query(
          collection(db, COLLECTIONS.RIDES), 
          where('driverId', '==', currentUser.uid), 
          where('status', '==', 'active')
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setRideId(snap.docs[0].id);
        }
      } catch (error) {
        console.error('Error finding active ride', error);
      } finally {
        setIsSearchingActive(false);
      }
    };
    findActiveRide();
  }, [passedRideId, currentUser?.uid]);

  useEffect(() => {
    if (!rideId) return;
    let isMounted = true;
    
    const initializeRide = async () => {
      try {
        // 1. Fetch Ride
        const rideRef = doc(db, COLLECTIONS.RIDES, rideId as string);
        const rideSnap = await getDoc(rideRef);
        
        if (!rideSnap.exists() && isMounted) {
          Alert.alert('Error', 'Ride not found');
          navigation.goBack();
          return;
        }
        
        const rideData = rideSnap.data() as Ride;
        if (isMounted) setRide(rideData);

        // 2. Set Status to Active
        if (rideData.status === 'scheduled') {
          await updateDoc(rideRef, { status: 'active' });
        }

        // 3. Request Location Permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to track the active ride.');
          navigation.goBack();
          return;
        }

        // 4. Start Location Watcher
        locationSubscriber.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 5,
          },
          async (location) => {
            const coords = location.coords;
            if (isMounted) setDriverLocation(coords);

            // Upload directly to Firestore LIVE_LOCATIONS document
            try {
              if (currentUser?.uid && rideId) {
                await setDoc(doc(db, COLLECTIONS.LIVE_LOCATIONS, rideId), {
                  driverId: currentUser.uid,
                  rideId,
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  heading: coords.heading,
                  speed: coords.speed,
                  updatedAt: serverTimestamp()
                }, { merge: true });
              }
            } catch (err) {
              console.error('Error updating live location in Firestore:', err);
            }
          }
        );
        
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
    };
  }, [rideId, navigation, currentUser?.uid]);

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
            if (!rideId) return;
            try {
              // 1. Stop Location subscription
              if (locationSubscriber.current) {
                locationSubscriber.current.remove();
                locationSubscriber.current = null;
              }
              
              // 2. Complete Ride in Firestore
              await updateDoc(doc(db, COLLECTIONS.RIDES, rideId), { status: 'completed' });
              
              // 3. Delete from Live Locations
              await deleteDoc(doc(db, COLLECTIONS.LIVE_LOCATIONS, rideId));
              
              // 4. Navigate to Summary
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

  if (isSearchingActive) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Checking for active rides...</Text>
      </View>
    );
  }

  if (!rideId || !ride) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontSize: 40, marginBottom: SPACING.md }}>😴</Text>
        <Text style={{ fontSize: 18, color: COLORS.textSecondary }}>No Active Ride</Text>
        <Text style={{ color: 'gray', marginTop: 8 }}>Start a ride from the Home screen.</Text>
      </View>
    );
  }

  const mapRegion = driverLocation ? {
    latitude: driverLocation.latitude,
    longitude: driverLocation.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  } : {
    latitude: ride.startLocation.latitude,
    longitude: ride.startLocation.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const boardedPassengersCount = Object.values(ride.seatMap || {}).filter(
    (seat: any) => seat.status === 'booked'
  ).length;

  return (
    <View style={styles.container}>
      <MapView style={styles.map} region={mapRegion}>
        {/* Driver Marker */}
        {driverLocation && (
          <Marker
            coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }}
            title="🚌"
          >
            <View style={styles.driverMarkerContainer}>
              <Text style={{ fontSize: 24 }}>🚌</Text>
            </View>
          </Marker>
        )}

        {/* Start Location */}
        <Marker
          coordinate={{ latitude: ride.startLocation.latitude, longitude: ride.startLocation.longitude }}
          pinColor="green"
          title="Start"
          description={ride.startLocation.name}
        />

        {/* End Location */}
        <Marker
          coordinate={{ latitude: ride.endLocation.latitude, longitude: ride.endLocation.longitude }}
          pinColor="red"
          title="End"
          description={ride.endLocation.name}
        />

        {/* Polyline connecting start -> end directly (Or through stops if coordinates exist, but stops format here is just names, normally requires waypoints coordinates via Directions API) */}
        <Polyline
          coordinates={[
            { latitude: ride.startLocation.latitude, longitude: ride.startLocation.longitude },
            { latitude: ride.endLocation.latitude, longitude: ride.endLocation.longitude }
          ]}
          strokeColor={COLORS.primary}
          strokeWidth={4}
        />
      </MapView>

      <View style={styles.bottomPanel}>
        <View style={styles.panelHeader}>
          <Text style={styles.routeName}>{ride.routeName}</Text>
          <Text style={styles.passengerCount}>Passengers: {boardedPassengersCount} boarded / {ride.totalSeats} total</Text>
        </View>

        <ScrollView style={styles.stopsList}>
          {ride.stops.map((stop: any, i: number) => {
            const isReached = reachedStops.includes(stop.stopName);
            return (
              <View key={i} style={styles.stopCard}>
                <Text style={styles.stopName}>{i+1}. {stop.stopName}</Text>
                <Button 
                  mode={isReached ? "contained" : "outlined"} 
                  onPress={() => handleMarkReached(stop.stopName)}
                  buttonColor={isReached ? COLORS.success : undefined}
                  textColor={isReached ? 'white' : COLORS.primary}
                  compact
                  style={styles.reachButton}
                >
                  {isReached ? 'Marked Reached ✓' : 'Mark Reached'}
                </Button>
              </View>
            );
          })}
        </ScrollView>

        <Button 
          mode="contained" 
          buttonColor={COLORS.error} 
          style={styles.endRideButton}
          contentStyle={{ paddingVertical: 8 }}
          onPress={handleEndRide}
        >
           End Ride
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  driverMarkerContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  bottomPanel: {
    height: 280,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.md,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -5 },
  },
  panelHeader: {
    marginBottom: SPACING.md,
  },
  routeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  passengerCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  stopsList: {
    flex: 1,
    marginBottom: SPACING.md,
  },
  stopCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  stopName: {
    fontSize: 16,
    flex: 1,
  },
  reachButton: {
    borderRadius: 20,
  },
  endRideButton: {
    borderRadius: 8,
  }
});

export default ActiveRideScreen;
