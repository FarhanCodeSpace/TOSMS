import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Text, Button, Card } from "react-native-paper";
import { COLORS, SPACING, FONTS } from "@constants/theme";
import { StackScreenProps } from "@react-navigation/stack";
import { StudentHomeStackParamList } from "@navigation/types";
import { CommonActions } from "@react-navigation/native";

type BookingConfirmScreenProps = StackScreenProps<
  StudentHomeStackParamList,
  "BookingConfirm"
>;

export const BookingConfirmScreen: React.FC<BookingConfirmScreenProps> = ({
  route,
  navigation,
}) => {
  const { bookingId, fareAmount, routeName, seatNumber, driverName, rideId } =
    route.params;

  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleTrackRide = () => {
    navigation.navigate("TrackRide", {
      rideId,
    });
  };

  const handleGoHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "StudentHome" }],
      }),
    );
  };

  return (
    <View style={styles.container}>
      {/* Animated Check Circle */}
      <Animated.View
        style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}
      >
        <Text style={styles.checkEmoji}>✅</Text>
      </Animated.View>

      <Text style={styles.title}>Booking Confirmed!</Text>
      <Text style={styles.subtitle}>
        Your seat has been reserved successfully.
      </Text>

      {/* Booking Details Card */}
      <Card style={styles.detailsCard}>
        <Card.Content>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Route</Text>
            <Text style={styles.detailValue}>{routeName}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Seat Number</Text>
            <Text style={styles.detailValue}>Seat {seatNumber}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Driver</Text>
            <Text style={styles.detailValue}>{driverName}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fare</Text>
            <Text style={[styles.detailValue, { color: COLORS.accent }]}>
              PKR {fareAmount?.toLocaleString()}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.buttonsRow}>
        <Button
          mode="contained"
          buttonColor={COLORS.primary}
          style={styles.btn}
          onPress={handleTrackRide}
        >
          Track Ride
        </Button>
        <Button
          mode="outlined"
          textColor={COLORS.primary}
          style={styles.btn}
          onPress={handleGoHome}
        >
          Go Home
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
    elevation: 4,
  },
  checkEmoji: { fontSize: 60 },
  title: {
    fontSize: FONTS.xxl + 4,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    textAlign: "center",
  },
  detailsCard: {
    width: "100%",
    backgroundColor: COLORS.surface,
    elevation: 3,
    borderRadius: 12,
    marginBottom: SPACING.xl,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  detailLabel: { fontSize: FONTS.md, color: COLORS.textSecondary },
  detailValue: { fontSize: FONTS.md, fontWeight: "bold", color: COLORS.text },
  divider: { height: 1, backgroundColor: "#F0F0F0" },
  buttonsRow: { flexDirection: "row", gap: SPACING.md, width: "100%" },
  btn: { flex: 1, borderRadius: 8 },
});

export default BookingConfirmScreen;
