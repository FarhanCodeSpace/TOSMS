import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Text, Button } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import { getAuth } from "firebase/auth";
import { db } from "@config/firebase";
import { COLLECTIONS } from "@config/firebaseCollections";
import {
  doc,
  onSnapshot,
  runTransaction,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "@hooks/useAuth";
import { COLORS, SPACING, FONTS } from "@constants/theme";
import { StackScreenProps } from "@react-navigation/stack";
import { StudentHomeStackParamList } from "@navigation/types";

type SeatSelectionScreenProps = StackScreenProps<
  StudentHomeStackParamList,
  "SeatSelection"
>;

interface SeatInfo {
  status: "available" | "booked";
  studentId?: string;
  studentName?: string;
}

interface RideData {
  routeName: string;
  driverName: string;
  driverPhone: string;
  driverId: string;
  totalSeats: number;
  farePerSeat: number;
  seatMap: Record<number, SeatInfo>;
  stops: { stopName: string; order: number }[];
  departureTime: Timestamp;
  availableSeats: number;
  passengerIds: string[];
}

export const SeatSelectionScreen: React.FC<SeatSelectionScreenProps> = ({
  route,
  navigation,
}) => {
  const { rideId, fareAmount } = route.params;
  const { currentUser } = useAuth();

  const [ride, setRide] = useState<RideData | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [selectedStop, setSelectedStop] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.RIDES, rideId),
      (snap) => {
        if (!auth.currentUser) return;
        if (snap.exists()) {
          setRide(snap.data() as RideData);
        }
      },
      (error: any) => {
        if (error.code === "permission-denied") return;
        console.error("Seat selection ride listener error:", error);
      },
    );
    return () => unsubscribe();
  }, [rideId]);

  const getSeatStatus = (
    seatNum: number,
  ): "available" | "booked" | "selected" => {
    if (selectedSeat === seatNum) return "selected";
    return ride?.seatMap?.[seatNum]?.status || "available";
  };

  const getSeatColor = (status: ReturnType<typeof getSeatStatus>): string => {
    switch (status) {
      case "selected":
        return COLORS.primary;
      case "booked":
        return COLORS.error;
      default:
        return COLORS.success;
    }
  };

  const getSeatLabel = (seatNum: number): string => {
    const status = getSeatStatus(seatNum);
    if (status === "selected") return "✓";
    if (status === "booked") {
      const name = ride?.seatMap?.[seatNum]?.studentName || "";
      return name.substring(0, 2).toUpperCase();
    }
    return seatNum.toString();
  };

  const handleSeatPress = (seatNum: number) => {
    const status = ride?.seatMap?.[seatNum]?.status;
    if (status === "booked") return; // disabled
    setSelectedSeat((prev) => (prev === seatNum ? null : seatNum));
  };

  const handleConfirmBooking = async () => {
    if (isConfirming) return;

    if (!selectedSeat || !selectedStop || !currentUser?.uid || !ride) return;

    setIsConfirming(true);
    try {
      let newBookingId = "";

      await runTransaction(db, async (transaction) => {
        const rideRef = doc(db, COLLECTIONS.RIDES, rideId);
        const rideSnap = await transaction.get(rideRef);

        if (!rideSnap.exists()) throw new Error("Ride not found");

        const rideData = rideSnap.data() as RideData;
        const seatInfo = rideData.seatMap?.[selectedSeat];

        if (!seatInfo || seatInfo.status !== "available") {
          throw new Error("SEAT_TAKEN");
        }

        const bookingRef = doc(collection(db, COLLECTIONS.BOOKINGS));
        newBookingId = bookingRef.id;

        const bookingData = {
          bookingId: bookingRef.id,
          rideId,
          studentId: currentUser.uid,
          studentName: currentUser.fullName,
          studentPhone: currentUser.phone,
          driverId: rideData.driverId,
          driverName: rideData.driverName,
          routeName: rideData.routeName,
          departureTime: rideData.departureTime,
          seatNumber: selectedSeat,
          pickupStop: selectedStop,
          fareAmount: rideData.farePerSeat,
          status: "confirmed",
          paymentStatus: "pending",
          bookedAt: serverTimestamp(),
        };

        transaction.set(bookingRef, bookingData);

        // Update seatMap
        transaction.update(rideRef, {
          [`seatMap.${selectedSeat}`]: {
            status: "booked",
            studentId: currentUser.uid,
            studentName: currentUser.fullName,
          },
          availableSeats: (rideData.availableSeats || 1) - 1,
          passengerIds: [...(rideData.passengerIds || []), currentUser.uid],
        });
      });

      // Navigate to payment screen
      navigation.navigate("Payment", {
        bookingId: newBookingId,
        fareAmount: ride.farePerSeat,
        routeName: ride.routeName,
        seatNumber: selectedSeat,
        driverName: ride.driverName,
        rideId,
      } as any);
    } catch (error: any) {
      if (error?.message === "SEAT_TAKEN") {
        Alert.alert(
          "Seat Taken",
          "Seat was just booked! Please select another seat.",
        );
        setSelectedSeat(null);
      } else {
        console.error("Booking error:", error);
        Alert.alert("Error", "Failed to complete booking. Please try again.");
      }
    } finally {
      setIsConfirming(false);
    }
  };

  if (!ride) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const totalSeats = ride.totalSeats || 0;
  const rows: number[][] = [];
  for (let i = 1; i <= totalSeats; i += 4) {
    rows.push([i, i + 1, i + 2, i + 3].filter((n) => n <= totalSeats));
  }

  const isConfirmEnabled = selectedSeat !== null && selectedStop !== "";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Steering Wheel */}
        <View style={styles.busFront}>
          <Text style={styles.steeringWheel}>🚗</Text>
          <Text style={styles.driverLabel}>Driver</Text>
        </View>

        {/* Bus Seat Grid */}
        <View style={styles.busLayout}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.seatRow}>
              {/* Left side — seats 1, 2 of each group */}
              <View style={styles.seatGroup}>
                {row.slice(0, 2).map((seatNum) => {
                  const status = getSeatStatus(seatNum);
                  return (
                    <TouchableOpacity
                      key={seatNum}
                      style={[
                        styles.seat,
                        { backgroundColor: getSeatColor(status) },
                      ]}
                      onPress={() => handleSeatPress(seatNum)}
                      disabled={status === "booked"}
                    >
                      <Text style={styles.seatLabel}>
                        {getSeatLabel(seatNum)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Aisle gap */}
              <View style={styles.aisle} />

              {/* Right side — seats 3, 4 of each group */}
              <View style={styles.seatGroup}>
                {row.slice(2, 4).map((seatNum) => {
                  const status = getSeatStatus(seatNum);
                  return (
                    <TouchableOpacity
                      key={seatNum}
                      style={[
                        styles.seat,
                        { backgroundColor: getSeatColor(status) },
                      ]}
                      onPress={() => handleSeatPress(seatNum)}
                      disabled={status === "booked"}
                    >
                      <Text style={styles.seatLabel}>
                        {getSeatLabel(seatNum)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {[
            { color: COLORS.success, label: "Available" },
            { color: COLORS.error, label: "Booked" },
            { color: COLORS.primary, label: "Selected" },
          ].map(({ color, label }) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Selection Panel */}
      <View style={styles.bottomPanel}>
        <View style={styles.selectionRow}>
          <Text style={styles.selectionLabel}>Selected Seat:</Text>
          <Text style={styles.selectionValue}>
            {selectedSeat ? `Seat ${selectedSeat}` : "None"}
          </Text>
        </View>

        <Text style={[styles.selectionLabel, { marginBottom: 4 }]}>
          Pickup Stop:
        </Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedStop}
            onValueChange={(v: string) => setSelectedStop(v)}
            style={styles.picker}
          >
            <Picker.Item label="Select pickup stop..." value="" />
            {ride.stops
              .sort((a, b) => a.order - b.order)
              .map((stop, i) => (
                <Picker.Item
                  key={i}
                  label={stop.stopName}
                  value={stop.stopName}
                />
              ))}
          </Picker>
        </View>

        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Fare:</Text>
          <Text style={styles.fareAmount}>
            PKR {(fareAmount || ride.farePerSeat)?.toLocaleString()}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.confirmBtn,
            !isConfirmEnabled && styles.confirmBtnDisabled,
          ]}
          disabled={!isConfirmEnabled || isConfirming}
          onPress={handleConfirmBooking}
          activeOpacity={0.85}
        >
          {isConfirming ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmBtnText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingBottom: 320 },
  busFront: {
    alignItems: "center",
    paddingVertical: SPACING.md,
    backgroundColor: "#E8F4F8",
    marginBottom: SPACING.md,
  },
  steeringWheel: { fontSize: 40 },
  driverLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sm,
    fontWeight: "bold",
  },
  busLayout: { paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  seatRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.sm,
  },
  seatGroup: { flexDirection: "row", gap: SPACING.sm },
  aisle: { width: 24 },
  seat: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  seatLabel: { color: "white", fontWeight: "bold", fontSize: 13 },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  legendText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    elevation: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  selectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  selectionLabel: { fontSize: FONTS.md, color: COLORS.textSecondary },
  selectionValue: {
    fontSize: FONTS.lg,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#DEDEDE",
    borderRadius: 8,
    marginBottom: SPACING.sm,
    overflow: "hidden",
  },
  picker: { height: 48 },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  fareLabel: { fontSize: FONTS.md, color: COLORS.textSecondary },
  fareAmount: { fontSize: FONTS.xl, fontWeight: "bold", color: COLORS.accent },
  confirmBtn: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: { backgroundColor: "#BDBDBD" },
  confirmBtnText: { color: "white", fontWeight: "700" },
});

export default SeatSelectionScreen;
