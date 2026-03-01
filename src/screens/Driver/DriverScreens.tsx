import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={styles.container}>
    <Text style={styles.text}>{name} Screen</Text>
  </View>
);

export const DriverHomeScreen = () => <PlaceholderScreen name="Driver Home" />;
export const CreateRideScreen = () => <PlaceholderScreen name="Create Ride" />;
export const ActiveRideScreen = () => <PlaceholderScreen name="Active Ride" />;
export const PassengersScreen = () => <PlaceholderScreen name="Passengers" />;
export const RideSummaryScreen = () => <PlaceholderScreen name="Ride Summary" />;
export const EarningsScreen = () => <PlaceholderScreen name="Earnings" />;
export const DriverProfileScreen = () => <PlaceholderScreen name="Driver Profile" />;
export const DriverPendingScreen = () => <PlaceholderScreen name="Driver Pending Approval" />;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  text: { fontSize: 18, fontWeight: 'bold', color: '#1A3C5E' },
});
