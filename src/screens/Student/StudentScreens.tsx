import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={styles.container}>
    <Text style={styles.text}>{name} Screen</Text>
  </View>
);

export const StudentHomeScreen = () => <PlaceholderScreen name="Student Home" />;
export const RideDetailScreen = () => <PlaceholderScreen name="Ride Detail" />;
export const SeatSelectionScreen = () => <PlaceholderScreen name="Seat Selection" />;
export const PaymentScreen = () => <PlaceholderScreen name="Payment" />;
export const BookingConfirmScreen = () => <PlaceholderScreen name="Booking Confirm" />;
export const RideHistoryScreen = () => <PlaceholderScreen name="Ride History" />;
export const TrackRideScreen = () => <PlaceholderScreen name="Track Ride" />;
export const StudentProfileScreen = () => <PlaceholderScreen name="Student Profile" />;
export const EditProfileScreen = () => <PlaceholderScreen name="Edit Profile" />;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  text: { fontSize: 18, fontWeight: 'bold', color: '#1A3C5E' },
});
