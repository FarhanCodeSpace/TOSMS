import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Linking,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { Text, Avatar, ActivityIndicator, Button } from "react-native-paper";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { db } from "@config/firebase";
import { COLLECTIONS } from "@config/firebaseCollections";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@hooks/useAuth";
import { COLORS, SPACING, FONTS } from "@constants/theme";
import { StackScreenProps } from "@react-navigation/stack";
import { StudentHomeStackParamList } from "@navigation/types";
import { CommonActions } from "@react-navigation/native";
import { Ride, Route, LiveLocation, User } from "@types";

type TrackRideScreenProps = StackScreenProps<
  StudentHomeStackParamList,
  "TrackRide"
>;

const { width, height } = Dimensions.get("window");

// Helper function for distance calculation
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
};

export const TrackRideScreen: React.FC<TrackRideScreenProps> = ({
  route,
  navigation,
}) => {
  const { rideId } = route.params;
  const { currentUser } = useAuth();

  // Ride Data State
  const [ride, setRide] = useState<Ride | null>(null);
  const [routeData, setRouteData] = useState<Route | null>(null);
  const [driverData, setDriverData] = useState<User | null>(null);
  const [driverLocation, setDriverLocation] = useState<LiveLocation | null>(
    null,
  );
  const [studentLocation, setStudentLocation] =
    useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  // Animation Refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotPulseAnim = useRef(new Animated.Value(1)).current;
  const driverMarkerLat = useRef(new Animated.Value(0)).current;
  const driverMarkerLng = useRef(new Animated.Value(0)).current;
  const prevCoord = useRef<{ latitude: number; longitude: number } | null>(
    null,
  );

  // ── ON MOUNT: INITIAL FETCH ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch ride document
        const rideRef = doc(db, COLLECTIONS.RIDES, rideId);
        const rideSnap = await getDoc(rideRef);

        if (rideSnap.exists()) {
          const rideData = rideSnap.data() as Ride;
          setRide(rideData);

          // 2. Fetch route document if routeId exists
          if (rideData.routeId) {
            const routeRef = doc(db, COLLECTIONS.ROUTES, rideData.routeId);
            const routeSnap = await getDoc(routeRef);
            if (routeSnap.exists()) {
              const rData = routeSnap.data() as Route;
              setRouteData(rData);
            }
          }
        }

        // 3. Get student location (Safe check)
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const location = await Location.getCurrentPositionAsync({});
            setStudentLocation(location);
          }
        } catch (e) {
          console.warn("Could not get student location:", e);
        }
      } catch (error) {
        console.error("Error initializing tracking:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // 4. Start pulsing animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(dotPulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [rideId]);

  // ── FETCH DRIVER DATA ──
  useEffect(() => {
    const fetchDriver = async () => {
      const assignedDriverId = ride?.driverId || routeData?.assignedDriverId;
      if (assignedDriverId) {
        try {
          console.log("Fetching driver data for ID:", assignedDriverId);
          const driverRef = doc(db, COLLECTIONS.USERS, assignedDriverId);
          const driverSnap = await getDoc(driverRef);
          if (driverSnap.exists()) {
            const data = driverSnap.data() as User;
            console.log("Driver data fetched successfully:", data.fullName, data.vehiclePlate);
            setDriverData(data);
          } else {
            console.warn("Driver document does not exist for ID:", assignedDriverId);
          }
        } catch (error) {
          console.error("Error fetching driver data:", error);
        }
      }
    };
    fetchDriver();
  }, [ride?.driverId, routeData?.assignedDriverId]);

  // ── REAL-TIME LISTENERS ──
  useEffect(() => {
    // Listener 1: Ride status changes
    const rideUnsub = onSnapshot(
      doc(db, COLLECTIONS.RIDES, rideId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Ride;
          setRide(data);
        }
      },
    );

    // Listener 2: Driver live location
    const locationUnsub = onSnapshot(
      doc(db, COLLECTIONS.LIVE_LOCATIONS, rideId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as LiveLocation;
          setDriverLocation(data);

          // Smooth animation for driver marker
          if (prevCoord.current) {
            driverMarkerLat.setValue(prevCoord.current.latitude);
            driverMarkerLng.setValue(prevCoord.current.longitude);

            Animated.timing(driverMarkerLat, {
              toValue: data.latitude,
              duration: 1000,
              useNativeDriver: false,
            }).start();

            Animated.timing(driverMarkerLng, {
              toValue: data.longitude,
              duration: 1000,
              useNativeDriver: false,
            }).start();

            // Next Stop Logic: Check if driver reached current next stop
            if (routeData && routeData.stops[currentStopIndex]) {
              const dist = calculateDistance(
                data.latitude,
                data.longitude,
                routeData.stops[currentStopIndex].coordinates.latitude,
                routeData.stops[currentStopIndex].coordinates.longitude,
              );
              if (dist < 200 && currentStopIndex < routeData.stops.length - 1) {
                setCurrentStopIndex((prev) => prev + 1);
              }
            }
          } else {
            driverMarkerLat.setValue(data.latitude);
            driverMarkerLng.setValue(data.longitude);
          }
          prevCoord.current = {
            latitude: data.latitude,
            longitude: data.longitude,
          };
        } else {
          setDriverLocation(null);
        }
      },
    );

    return () => {
      rideUnsub();
      locationUnsub();
    };
  }, [rideId, routeData, currentStopIndex]);

  // Handle Loading
  if (loading || !ride) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10 }}>Connecting to ride...</Text>
      </View>
    );
  }

  // Determine Screen State
  const isCompleted = ride.status === "completed";
  const isActive = ride.status === "active" && !!driverLocation;
  const isWaiting = ride.status === "scheduled" || !driverLocation;

  // ── STATE 3: COMPLETED ──
  if (isCompleted) {
    return (
      <View style={styles.completedContainer}>
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.primary }]}
        />
        <View style={styles.completedContent}>
          <MaterialCommunityIcons name="check-circle" size={80} color="white" />
          <Text style={styles.completedTitle}>You have arrived!</Text>
          <Text style={styles.completedRouteName}>
            {ride.routeName || "Route Completed"}
          </Text>

          <View style={styles.completedActions}>
            <Button
              mode="outlined"
              textColor="white"
              style={styles.reviewBtn}
              contentStyle={styles.btnContent}
              onPress={() => {
                const effectiveDriverId =
                  ride.driverId ||
                  routeData?.assignedDriverId ||
                  driverData?.uid;

                if (!effectiveDriverId || effectiveDriverId === "") {
                  Alert.alert(
                    "Error",
                    "Driver ID is missing in ride, route, and driver records. Please ensure a driver is assigned in the database.",
                  );
                  return;
                }
                navigation.navigate("Review", {
                  rideId,
                  driverId: effectiveDriverId,
                  driverName: effectiveDriverName,
                });
              }}
            >
              Leave a Review
            </Button>
            <Button
              mode="contained"
              buttonColor="white"
              textColor={COLORS.primary}
              style={styles.homeBtn}
              contentStyle={styles.btnContent}
              onPress={() => {
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: "StudentHome" }],
                  }),
                );
              }}
            >
              Go Home
            </Button>
          </View>
        </View>
      </View>
    );
  }

  // Map Region Calculation
  const getInitialRegion = () => {
    if (isActive && driverLocation) {
      return {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };
    }
    if (routeData && routeData.stops && routeData.stops.length > 0) {
      return {
        latitude: routeData.stops[0].coordinates.latitude,
        longitude: routeData.stops[0].coordinates.longitude,
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

  const nextStopName =
    routeData?.stops?.[currentStopIndex]?.stopName || "Final Destination";
  const effectiveDriverName =
    ride.driverName ||
    routeData?.assignedDriverName ||
    driverData?.fullName ||
    "Driver";
  const effectiveVehiclePlate =
    ride.vehiclePlate || driverData?.vehiclePlate || "N/A";
  const effectiveDriverPhone = ride.driverPhone || driverData?.phone || "";

  const driverInitials = effectiveDriverName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // ── STATE 1 & 2: RENDER ──
  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={getInitialRegion()}
      >
        {/* Route Polyline (State 2) */}
        {isActive &&
          routeData &&
          routeData.stops &&
          routeData.stops.length > 0 && (
            <Polyline
              coordinates={routeData.stops.map((s) => s.coordinates)}
              strokeColor={COLORS.primary}
              strokeWidth={4}
            />
          )}

        {/* Route Stops */}
        {routeData?.stops?.map((stop, index) => (
          <Marker
            key={`stop-${index}`}
            coordinate={stop.coordinates}
            title={stop.stopName}
          >
            <View style={styles.stopMarker}>
              <Text style={styles.stopText}>{index + 1}</Text>
            </View>
          </Marker>
        ))}

        {/* Driver Marker (State 2) */}
        {isActive && driverLocation && (
          <Marker.Animated
            coordinate={{
              latitude: driverMarkerLat as any,
              longitude: driverMarkerLng as any,
            }}
          >
            <View style={styles.driverMarker}>
              <MaterialCommunityIcons name="bus" size={20} color="white" />
            </View>
          </Marker.Animated>
        )}

        {/* Student Location Marker (State 2) */}
        {isActive && studentLocation && (
          <Marker
            coordinate={{
              latitude: studentLocation.coords.latitude,
              longitude: studentLocation.coords.longitude,
            }}
          >
            <MaterialCommunityIcons name="circle" size={12} color="blue" />
          </Marker>
        )}
      </MapView>

      {/* ── STATE 1: WAITING BANNER ── */}
      {isWaiting && !isCompleted && (
        <Animated.View style={[styles.waitingBanner, { opacity: pulseAnim }]}>
          <View style={styles.bannerRow}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={20}
              color="#F59E0B"
            />
            <Text style={styles.waitingText}>
              Waiting for driver to start the ride
            </Text>
          </View>
        </Animated.View>
      )}

      {/* ── STATE 2: ACTIVE INFO CARD ── */}
      {isActive && (
        <View style={styles.infoCard}>
          <View style={styles.handleBar} />

          <View style={styles.driverRow}>
            {driverData?.profileImageUrl ? (
              <Avatar.Image
                size={48}
                source={{ uri: driverData.profileImageUrl }}
              />
            ) : (
              <Avatar.Text
                size={48}
                label={driverInitials}
                style={{ backgroundColor: COLORS.primary }}
              />
            )}
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{effectiveDriverName}</Text>
              <View style={styles.plateRow}>
                <MaterialCommunityIcons
                  name="card-account-details-outline"
                  size={14}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.plateNumber}>{effectiveVehiclePlate}</Text>
              </View>
            </View>

            {effectiveDriverPhone && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${effectiveDriverPhone}`)}
                style={styles.phoneIcon}
              >
                <MaterialCommunityIcons
                  name="phone"
                  size={20}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.nextStopRow}>
            <MaterialCommunityIcons
              name="map-marker-right"
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.nextStopLabel}>Next Stop:</Text>
            <Text style={styles.nextStopValue} numberOfLines={1}>
              {nextStopName}
            </Text>

            <View style={styles.liveBadge}>
              <Animated.View
                style={[styles.liveDot, { opacity: dotPulseAnim }]}
              />
              <Text style={styles.liveBadgeText}>Live</Text>
            </View>
          </View>
        </View>
      )}

      {/* Floating Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <MaterialCommunityIcons
          name="arrow-left"
          size={24}
          color={COLORS.text}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  map: { flex: 1 },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 25,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  // State 1: Waiting Banner
  waitingBanner: {
    position: "absolute",
    top: 70,
    left: 16,
    right: 16,
    backgroundColor: "#FFF9E6",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F59E0B",
    elevation: 3,
  },
  bannerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  waitingText: {
    fontSize: 14,
    color: "#92400E",
    fontWeight: "500",
  },

  // State 2: Info Card Redesign
  infoCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    elevation: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 16,
  },
  driverRow: { flexDirection: "row", alignItems: "center" },
  driverDetails: { flex: 1, marginLeft: 16 },
  driverName: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  plateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  plateNumber: { fontSize: 13, color: COLORS.textSecondary },
  phoneIcon: {
    backgroundColor: "#F0F4FF",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginBottom: 16,
    marginTop: 16,
  },
  nextStopRow: { flexDirection: "row", alignItems: "center" },
  nextStopLabel: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 8 },
  nextStopValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginLeft: 4,
    flex: 1,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
    marginRight: 6,
  },
  liveBadgeText: { fontSize: 11, fontWeight: "600", color: "#16A34A" },

  // Markers
  driverMarker: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: "white",
    elevation: 5,
  },
  stopMarker: {
    backgroundColor: "white",
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  stopText: { fontSize: 12, fontWeight: "bold", color: COLORS.primary },

  // State 3: Completed
  completedContainer: { flex: 1 },
  completedContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    zIndex: 1,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    marginTop: 20,
  },
  completedRouteName: {
    fontSize: 16,
    color: "white",
    opacity: 0.8,
    marginTop: 8,
    textAlign: "center",
  },
  completedActions: { width: "100%", marginTop: 40, gap: 15 },
  reviewBtn: { borderRadius: 12, borderColor: "white" },
  homeBtn: { borderRadius: 12 },
  btnContent: { paddingVertical: 14 },
});

export default TrackRideScreen;
