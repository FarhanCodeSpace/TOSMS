import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useAuth } from '@hooks/useAuth';
import { COLORS, SPACING, FONTS } from '@constants/theme';
import { StackScreenProps } from '@react-navigation/stack';
import { StudentRidesStackParamList } from '@navigation/types';
import { CommonActions } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type TrackRideScreenProps = StackScreenProps<StudentRidesStackParamList, 'TrackRide'>;

interface RideInfo {
  routeName: string;
  driverName: string;
  driverPhone: string;
  vehiclePlate: string;
  status: 'scheduled' | 'active' | 'completed';
  stops: { stopName: string; order: number }[];
  startLocation: { name: string; latitude: number; longitude: number };
  endLocation: { name: string; latitude: number; longitude: number };
}

interface LiveLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

export const TrackRideScreen: React.FC<TrackRideScreenProps> = ({ route, navigation }) => {
  const { rideId } = route.params;
  const { currentUser } = useAuth();

  const [rideInfo, setRideInfo] = useState<RideInfo | null>(null);
  const [liveLocation, setLiveLocation] = useState<LiveLocation | null>(null);
  const [studentLocation, setStudentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [rideStatus, setRideStatus] = useState<'scheduled' | 'active' | 'completed'>('scheduled');

  // For smooth animation of driver marker
  const animatedLat = useRef(new Animated.Value(0)).current;
  const animatedLng = useRef(new Animated.Value(0)).current;
  const prevCoordRef = useRef<LiveLocation | null>(null);

  // Pulsing banner animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulsing animation for waiting banner
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    const init = async () => {
      // Fetch ride info
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.RIDES, rideId));
        if (snap.exists()) {
          const data = snap.data() as RideInfo;
          setRideInfo(data);
          setRideStatus(data.status);
        }
      } catch (e) {
        console.error('Error fetching ride info:', e);
      }

      // Get student's current location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setStudentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch (e) {
        console.error('Error getting student location:', e);
      }
    };
    init();
  }, [rideId]);

  // Listen to live location updates
  useEffect(() => {
    const unsubLive = onSnapshot(doc(db, COLLECTIONS.LIVE_LOCATIONS, rideId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as LiveLocation;
        setLiveLocation(data);

        // Animate marker smoothly
        if (prevCoordRef.current) {
          animatedLat.setValue(prevCoordRef.current.latitude);
          animatedLng.setValue(prevCoordRef.current.longitude);
          Animated.parallel([
            Animated.timing(animatedLat, { toValue: data.latitude, duration: 1000, useNativeDriver: false }),
            Animated.timing(animatedLng, { toValue: data.longitude, duration: 1000, useNativeDriver: false }),
          ]).start();
        } else {
          animatedLat.setValue(data.latitude);
          animatedLng.setValue(data.longitude);
        }
        prevCoordRef.current = data;
      } else {
        setLiveLocation(null);
      }
    });

    // Also listen to ride status changes
    const unsubRide = onSnapshot(doc(db, COLLECTIONS.RIDES, rideId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as RideInfo;
        setRideStatus(data.status);
        setRideInfo(data);
      }
    });

    return () => {
      unsubLive();
      unsubRide();
    };
  }, [rideId]);

  if (!rideInfo) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading ride...</Text>
      </View>
    );
  }

  // State 3: Completed
  if (rideStatus === 'completed') {
    return (
      <View style={styles.completedOverlay}>
        <Text style={styles.completedEmoji}>🎉</Text>
        <Text style={styles.completedTitle}>You have arrived!</Text>
        <Text style={styles.completedRoute}>{rideInfo.routeName}</Text>
        <View style={styles.completedButtons}>
          <Button
            mode="outlined"
            style={styles.completedBtn}
            textColor={COLORS.primary}
            onPress={() => Alert.alert('Review', 'Review screen coming soon!')}
          >
            Leave a Review
          </Button>
          <Button
            mode="contained"
            buttonColor={COLORS.primary}
            style={styles.completedBtn}
            onPress={() =>
              navigation.dispatch(
                CommonActions.reset({ index: 0, routes: [{ name: 'RideHistory' }] })
              )
            }
          >
            Go Home
          </Button>
        </View>
      </View>
    );
  }

  const mapRegion = (liveLocation && liveLocation.latitude && liveLocation.longitude)
    ? {
        latitude: liveLocation.latitude,
        longitude: liveLocation.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      }
    : (rideInfo?.startLocation?.latitude && rideInfo?.startLocation?.longitude)
    ? {
        latitude: rideInfo.startLocation.latitude,
        longitude: rideInfo.startLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

  const polylineCoords = (rideInfo?.startLocation && rideInfo?.endLocation) 
    ? [
        { latitude: rideInfo.startLocation.latitude, longitude: rideInfo.startLocation.longitude },
        { latitude: rideInfo.endLocation.latitude, longitude: rideInfo.endLocation.longitude },
      ]
    : [];

  return (
    <View style={styles.container}>
      {/* ── Floating Back Button ── */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.text} />
      </TouchableOpacity>



      <MapView style={styles.map} region={mapRegion}>
        {/* Route polyline */}
        <Polyline coordinates={polylineCoords} strokeColor={COLORS.primary} strokeWidth={3} />

        {/* Start marker */}
        {rideInfo?.startLocation && (
          <Marker
            coordinate={{ latitude: rideInfo.startLocation.latitude, longitude: rideInfo.startLocation.longitude }}
            pinColor="green"
            title="Start"
            description={rideInfo.startLocation.name}
          />
        )}

        {/* End marker */}
        {rideInfo?.endLocation && (
          <Marker
            coordinate={{ latitude: rideInfo.endLocation.latitude, longitude: rideInfo.endLocation.longitude }}
            pinColor="red"
            title="End"
            description={rideInfo.endLocation.name}
          />
        )}

        {/* Stop markers */}
        {rideInfo?.stops?.map((stop, i) => (
          rideInfo.startLocation && (
            <Marker
              key={i}
              coordinate={{ latitude: rideInfo.startLocation.latitude, longitude: rideInfo.startLocation.longitude }}
              pinColor="blue"
              title={stop.stopName}
            />
          )
        ))}

        {/* State 2 - Animated driver marker */}
        {liveLocation && (
          <Marker
            coordinate={{ latitude: liveLocation.latitude, longitude: liveLocation.longitude }}
            title="Driver 🚌"
          >
            <View style={styles.driverMarker}>
              <Text style={{ fontSize: 22 }}>🚌</Text>
            </View>
          </Marker>
        )}

        {/* Student location */}
        {studentLocation && (
          <Marker coordinate={studentLocation} title="You" pinColor="blue" />
        )}
      </MapView>

      {/* New Bottom Info Panel */}
      <View style={styles.bottomPanel}>
        {rideStatus === 'scheduled' && (
          <View style={styles.waitingBannerNew}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#F59E0B" />
            <Text style={styles.waitingBannerText}>Waiting for driver to start</Text>
          </View>
        )}

        <View style={styles.panelTopRow}>
          <Text style={styles.panelDriverName}>{rideInfo.driverName}</Text>
          <TouchableOpacity 
            style={styles.panelPhoneBtn}
            onPress={() => Linking.openURL(`tel:${rideInfo.driverPhone}`)}
          >
            <MaterialCommunityIcons name="phone" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.panelSecondRow}>
          <MaterialCommunityIcons name="car-info" size={14} color={COLORS.textSecondary} />
          <Text style={styles.panelVehiclePlate}>
            {rideInfo.vehiclePlate ? rideInfo.vehiclePlate : 'Vehicle info unavailable'}
          </Text>
        </View>

        <View style={styles.panelStatusRow}>
          <View style={[styles.panelStatusBadge, { 
            backgroundColor: rideStatus === 'active' ? '#F0FFF4' : 
                             rideStatus === 'scheduled' ? '#FFF9E6' : '#F3F4F6' 
          }]}>
            <View style={[styles.panelStatusDot, { 
              backgroundColor: rideStatus === 'active' ? '#16A34A' : 
                               rideStatus === 'scheduled' ? '#F59E0B' : '#9CA3AF' 
            }]} />
            <Text style={[styles.panelStatusText, { 
              color: rideStatus === 'active' ? '#16A34A' : 
                     rideStatus === 'scheduled' ? '#92400E' : '#6B7280' 
            }]}>
              {rideStatus === 'active' ? 'Ride in Progress' : 
               rideStatus === 'scheduled' ? 'Starting Soon' : 'Ride Completed'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  waitingBanner: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#FFC107',
    padding: SPACING.md,
    borderRadius: 12,
    zIndex: 10,
    elevation: 4,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  waitingText: { textAlign: 'center', fontWeight: 'bold', color: '#4A3000' },
  driverMarker: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    elevation: 4,
  },
  bottomPanel: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 10,
  },
  panelTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelDriverName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  panelPhoneBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#16A34A',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  panelSecondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  panelVehiclePlate: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  panelStatusRow: {
    marginTop: 10,
    alignItems: 'flex-start',
  },
  panelStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  panelStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  panelStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  waitingBannerNew: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waitingBannerText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  completedOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  completedEmoji: { fontSize: 80, marginBottom: SPACING.lg },
  completedTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary, marginBottom: SPACING.sm },
  completedRoute: { fontSize: FONTS.lg, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  completedButtons: { flexDirection: 'row', gap: SPACING.md },
  completedBtn: { flex: 1, borderRadius: 8 },
});

export default TrackRideScreen;
