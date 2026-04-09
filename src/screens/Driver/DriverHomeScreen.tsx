import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { Text, Avatar } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@hooks/useAuth";
import { COLORS } from "@constants/theme";
import { db } from "@config/firebase";
import { COLLECTIONS } from "@config/firebaseCollections";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import {
  getPakistanTodayString,
  getPakistanTomorrowString,
} from "@utils/dateHelpers";
import { format } from "date-fns";
import { Route, Ride } from "@types";
import { StackNavigationProp } from "@react-navigation/stack";
import { DriverHomeStackParamList } from "@navigation/types";

type DriverHomeScreenProps = {
  navigation: StackNavigationProp<DriverHomeStackParamList, "DriverHome">;
};

const DriverHomeScreen: React.FC<DriverHomeScreenProps> = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [myRoute, setMyRoute] = useState<(Route & { routeId: string }) | null>(
    null,
  );
  const [driverAvailabilityDoc, setDriverAvailabilityDoc] = useState<any>(null);
  const [todayRide, setTodayRide] = useState<
    (Ride & { rideId: string }) | null
  >(null);
  const [todayAvailableCount, setTodayAvailableCount] = useState(0);
  const [todayBoardedCount, setTodayBoardedCount] = useState(0);
  const [rideLoading, setRideLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [pulseAnim] = useState(new Animated.Value(1));

  // FIX 1: Greeting based on Pakistan Time
  const getGreeting = () => {
    const now = new Date();
    const pakistanTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const hour = pakistanTime.getUTCHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    if (hour >= 17 && hour < 21) return "Good Evening";
    return "Good Night";
  };

  // FIX 3: Driver Availability Listener (for tomorrow)
  useEffect(() => {
    if (!currentUser?.uid) return;
    const tomorrowStr = getPakistanTomorrowString();
    const availDocId = currentUser.uid + "_" + tomorrowStr;
    const unsub = onSnapshot(
      doc(db, COLLECTIONS.AVAILABILITY, availDocId),
      (snap) => {
        if (snap.exists()) {
          setDriverAvailabilityDoc({ ...snap.data() });
        } else {
          setDriverAvailabilityDoc(null);
        }
      },
      (error: any) => {
        if (error.code !== "permission-denied") {
          console.error("Availability listener error:", error);
        }
        setDriverAvailabilityDoc(null);
      },
    );
    return () => unsub();
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const cleanups: (() => void)[] = [];

    const fetchRouteAndRides = async () => {
      try {
        setRouteLoading(true);
        console.log("Fetching route for driver:", currentUser.uid);
        const routeQuery = query(
          collection(db, COLLECTIONS.ROUTES),
          where("assignedDriverId", "==", currentUser.uid),
        );
        const routeSnap = await getDocs(routeQuery);

        if (!routeSnap.empty) {
          const routeDoc = routeSnap.docs[0];
          const routeData = {
            routeId: routeDoc.id,
            ...routeDoc.data(),
          } as Route & { routeId: string };

          setMyRoute(routeData);
          setRouteLoading(false);

          const todayStr = getPakistanTodayString();
          const studentIds = routeData.studentIds || [];

          if (studentIds.length > 0) {
            // Today's available and boarded count listener
            const todayStatusMap: Record<string, boolean> = {};
            const todayBoardedMap: Record<string, boolean> = {};

            studentIds.forEach((sid: string) => {
              const docId = `${sid}_${todayStr}`;
              const unsub = onSnapshot(
                doc(db, COLLECTIONS.AVAILABILITY, docId),
                (docSnap) => {
                  const data = docSnap.exists() ? docSnap.data() : null;
                  todayStatusMap[sid] = data?.isAvailable === true;
                  todayBoardedMap[sid] = data?.boarded === true;

                  const availableCount =
                    Object.values(todayStatusMap).filter(Boolean).length;
                  const boardedCount =
                    Object.values(todayBoardedMap).filter(Boolean).length;

                  setTodayAvailableCount(availableCount);
                  setTodayBoardedCount(boardedCount);
                },
              );
              cleanups.push(unsub);
            });
          }

          // FIX 1: Ride Listener INSIDE route fetch
          console.log(
            "Starting ride listener for routeId:",
            routeDoc.id,
            "date:",
            todayStr,
          );
          const ridesQuery = query(
            collection(db, COLLECTIONS.RIDES),
            where("routeId", "==", routeDoc.id),
            where("status", "in", ["scheduled", "active"]),
          );

          const unsubRides = onSnapshot(
            ridesQuery,
            (snapshot) => {
              console.log("Rides snapshot size:", snapshot.size);
              let found: (Ride & { rideId: string }) | null = null;

              snapshot.forEach((d) => {
                const rData = d.data();
                console.log("Ride doc:", d.id, rData.date, rData.status);
                if (rData.date === todayStr) {
                  found = { rideId: d.id, ...rData } as Ride & {
                    rideId: string;
                  };
                }
              });

              console.log("Found ride:", found);
              setTodayRide(found);
              setRideLoading(false);
            },
            (err: any) => {
              if (err.code !== "permission-denied") {
                console.error("Ride listener error:", err);
              }
              setRideLoading(false);
            },
          );
          cleanups.push(unsubRides);
        } else {
          console.log("No route found for driver");
          setRouteLoading(false);
          setRideLoading(false);
        }
      } catch (error) {
        console.error("Error in fetchRouteAndRides:", error);
        setRouteLoading(false);
        setRideLoading(false);
      }
    };

    fetchRouteAndRides();

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    if (todayRide?.status === "active") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [todayRide?.status]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getInitials = (name: string) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"
    );
  };

  const handleStartRide = async () => {
    if (!todayRide || !myRoute) return;
    try {
      await updateDoc(doc(db, COLLECTIONS.RIDES, todayRide.rideId), {
        status: "active",
      });
      navigation.navigate("ActiveRide", {
        rideId: todayRide.rideId,
        routeId: myRoute.routeId,
      });
    } catch (error) {
      console.error("Error starting ride:", error);
    }
  };

  const handleResumeRide = () => {
    if (!todayRide || !myRoute) return;
    navigation.navigate("ActiveRide", {
      rideId: todayRide.rideId,
      routeId: myRoute.routeId,
    });
  };

  const totalStudents = myRoute?.studentIds?.length || 0;
  const currentTimeStr = format(new Date(), "h:mm a");
  const todayDateFormatted = format(new Date(), "EEEE, MMMM d");

  if (routeLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.driverNameText}>{currentUser?.fullName}</Text>
              <Text style={styles.dateText}>{todayDateFormatted}</Text>
            </View>
            {/* FIX 3: Header Avatar navigates to Profile */}
            <TouchableOpacity
              onPress={() => navigation.navigate("DriverProfile")}
            >
              {currentUser?.profileImageUrl ? (
                <Avatar.Image
                  size={44}
                  source={{ uri: currentUser.profileImageUrl }}
                />
              ) : (
                <Avatar.Text
                  size={44}
                  label={getInitials(currentUser?.fullName || "U")}
                  style={{ backgroundColor: COLORS.accent }}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Today Summary Card ── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons
              name="account-group"
              size={20}
              color={COLORS.primary}
            />
            <Text style={[styles.summaryNumber, { color: COLORS.primary }]}>
              {todayAvailableCount}
            </Text>
            <Text style={styles.summaryLabel}>Available</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <MaterialCommunityIcons
              name="map-marker-path"
              size={20}
              color="#16A34A"
            />
            <Text style={[styles.summaryNumber, { color: "#16A34A" }]}>
              {totalStudents}
            </Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <MaterialCommunityIcons
              name="bus"
              size={20}
              color={COLORS.accent}
            />
            <Text style={[styles.summaryNumber, { color: COLORS.accent }]}>
              {todayRide ? "1" : "0"}
            </Text>
            <Text style={styles.summaryLabel}>Ride Today</Text>
          </View>
        </View>

        {/* ── Mini Cards Row (Availability + My Route) ── */}
        <View style={styles.miniCardsRow}>
          {/* LEFT CARD: Availability */}
          <TouchableOpacity
            style={[
              styles.splitCard,
              driverAvailabilityDoc === null
                ? styles.notMarkedCard
                : driverAvailabilityDoc.isAvailable
                  ? styles.availableCard
                  : styles.unavailableCard,
            ]}
            onPress={() => navigation.navigate("DriverAvailability")}
          >
            <View style={styles.splitCardHeader}>
              <MaterialCommunityIcons
                name={
                  driverAvailabilityDoc === null
                    ? "calendar-today"
                    : driverAvailabilityDoc.isAvailable
                      ? "calendar-check"
                      : "close-circle"
                }
                size={16}
                color={
                  driverAvailabilityDoc === null
                    ? "#F59E0B"
                    : driverAvailabilityDoc.isAvailable
                      ? "#16A34A"
                      : "#DC2626"
                }
              />
              <Text
                style={[
                  styles.splitCardTitle,
                  {
                    color:
                      driverAvailabilityDoc === null
                        ? "#92400E"
                        : driverAvailabilityDoc.isAvailable
                          ? "#16A34A"
                          : "#DC2626",
                  },
                ]}
              >
                Availability
              </Text>
            </View>
            <Text
              style={[
                styles.splitCardMiddle,
                {
                  color:
                    driverAvailabilityDoc === null
                      ? "#92400E"
                      : driverAvailabilityDoc.isAvailable
                        ? "#16A34A"
                        : "#DC2626",
                },
              ]}
            >
              {driverAvailabilityDoc === null
                ? "Tap to mark"
                : driverAvailabilityDoc.isAvailable
                  ? "Available"
                  : "Not Available"}
            </Text>
            <Text style={styles.splitCardBottom}>
              {driverAvailabilityDoc === null
                ? "Setup today's status"
                : driverAvailabilityDoc.isAvailable &&
                    driverAvailabilityDoc.vehicleAvailable
                  ? "Vehicle Ready"
                  : driverAvailabilityDoc.isAvailable
                    ? "Vehicle Issue"
                    : "Backup Arranged"}
            </Text>
          </TouchableOpacity>

          {/* RIGHT CARD: My Route */}
          <TouchableOpacity
            style={[styles.splitCard, styles.myRouteCard]}
            onPress={() => (navigation as any).navigate("MyRouteTab")}
          >
            <View style={styles.splitCardHeader}>
              <MaterialCommunityIcons
                name="map-marker-path"
                size={16}
                color={COLORS.primary}
              />
              <Text style={[styles.splitCardTitle, { color: COLORS.primary }]}>
                My Route
              </Text>
            </View>
            <Text style={styles.splitCardRouteName} numberOfLines={1}>
              {myRoute?.routeName || "No Route Yet"}
            </Text>
            <Text style={styles.splitCardBottom}>{totalStudents} students</Text>
          </TouchableOpacity>
        </View>

        {/* ── Today's Ride Section ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Ride</Text>
          {todayRide && (
            <Text style={styles.currentTimeText}>{currentTimeStr}</Text>
          )}
        </View>
        <View style={styles.sectionContent}>
          {rideLoading ? (
            <ActivityIndicator
              color={COLORS.primary}
              size="large"
              style={{ marginVertical: 20 }}
            />
          ) : todayRide?.status === "scheduled" ? (
            <View style={styles.rideScheduledCard}>
              <View style={styles.rideTopRow}>
                <Text style={styles.rideRouteTitle}>{todayRide.routeName}</Text>
                <View style={styles.badgeOrange}>
                  <Text style={styles.badgeTextOrange}>Scheduled</Text>
                </View>
              </View>
              <View style={styles.rideInfoRow}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={16}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.rideInfoText}>
                  {String(todayRide.departureTime)}
                </Text>
                <View style={styles.flexSpacer} />
                <MaterialCommunityIcons
                  name="account-group"
                  size={16}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.rideInfoText}>
                  {todayBoardedCount} aboard
                </Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={handleStartRide}
              >
                <MaterialCommunityIcons
                  name="play-circle"
                  size={20}
                  color="white"
                />
                <Text style={styles.actionBtnText}>Start Ride</Text>
              </TouchableOpacity>
            </View>
          ) : todayRide?.status === "active" ? (
            <View style={styles.rideActiveCard}>
              <View style={styles.rideTopRow}>
                <Text style={styles.rideRouteTitle}>{todayRide.routeName}</Text>
                <View style={styles.badgeGreen}>
                  <Animated.View
                    style={[styles.liveDot, { opacity: pulseAnim }]}
                  />
                  <Text style={styles.badgeTextGreen}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.rideInProgressText}>
                Ride in progress since {String(todayRide.departureTime)}
              </Text>
              <TouchableOpacity
                style={styles.actionBtnGreen}
                onPress={handleResumeRide}
              >
                <Text style={styles.actionBtnText}>Resume</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noRideCentered}>
              <MaterialCommunityIcons
                name="calendar-remove"
                size={40}
                color="#D1D5DB"
              />
              <Text style={styles.noRideText}>No ride scheduled</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  header: {
    backgroundColor: "#1A3C5E",
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingText: {
    fontSize: 13,
    color: "white",
    opacity: 0.75,
  },
  driverNameText: {
    fontSize: 22,
    fontWeight: "800",
    color: "white",
  },
  dateText: {
    fontSize: 13,
    color: "white",
    opacity: 0.6,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#1A3C5E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#F3F4F6",
  },
  miniCardsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  splitCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  availableCard: { backgroundColor: "#F0FFF4", borderColor: "#16A34A" },
  unavailableCard: { backgroundColor: "#FFF0F0", borderColor: "#DC2626" },
  notMarkedCard: { backgroundColor: "#FFF9E6", borderColor: "#F59E0B" },
  myRouteCard: { backgroundColor: "white", borderColor: "#E5E7EB" },
  splitCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  splitCardTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  splitCardMiddle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  splitCardRouteName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  splitCardBottom: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  currentTimeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sectionContent: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  rideScheduledCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  rideActiveCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#16A34A",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  rideTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rideRouteTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  badgeOrange: {
    backgroundColor: "#FFF9E6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  badgeTextOrange: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "600",
  },
  badgeGreen: {
    backgroundColor: "#16A34A",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  badgeTextGreen: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "white",
  },
  rideInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  rideInfoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  flexSpacer: { width: 12 },
  rideDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  rideInProgressText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 10,
    marginBottom: 4,
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  actionBtnGreen: {
    backgroundColor: "#16A34A",
    borderRadius: 10,
    paddingVertical: 13,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  actionBtnText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
  noRideCentered: {
    alignItems: "center",
    paddingVertical: 28,
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  noRideText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
  },
});

export default DriverHomeScreen;
