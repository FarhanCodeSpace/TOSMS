import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@hooks/useAuth';
import { COLORS, SPACING, FONTS } from '@constants/theme';
import { formatDistanceToNow } from 'date-fns';

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  const first = parts[0]?.[0] || '';
  const last = parts[parts.length - 1]?.[0] || '';
  return (first + last).toUpperCase();
};

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
  <View style={{ flexDirection: 'row' }}>
    {[1, 2, 3, 4, 5].map(i => (
      <Text key={i} style={{ fontSize: 20, color: i <= Math.round(rating) ? COLORS.accent : '#D0D0D0' }}>
        ★
      </Text>
    ))}
  </View>
);

const vehicleIcon = (type?: string): string => {
  switch (type?.toLowerCase()) {
    case 'van': return '🚐';
    case 'bus': return '🚌';
    case 'coaster': return '🚎';
    default: return '🚗';
  }
};

export const DriverProfileScreen: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [totalRides, setTotalRides] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser?.uid) return;
      try {
        const q = query(
          collection(db, COLLECTIONS.RIDES),
          where('driverId', '==', currentUser.uid),
          where('status', '==', 'completed')
        );
        const snap = await getDocs(q);
        setTotalRides(snap.size);
      } catch (error) {
        console.error('Error fetching driver stats:', error);
      }
    };
    fetchStats();
  }, [currentUser?.uid]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const memberSince = currentUser?.createdAt
    ? formatDistanceToNow(
        typeof currentUser.createdAt === 'object' && 'toDate' in currentUser.createdAt
          ? (currentUser.createdAt as any).toDate()
          : new Date(currentUser.createdAt),
        { addSuffix: true }
      )
    : 'N/A';

  const avatarSource = currentUser?.profileImageUrl;

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        {avatarSource ? (
          <Image source={{ uri: avatarSource }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{getInitials(currentUser?.fullName || '')}</Text>
          </View>
        )}
        <Text style={styles.fullName}>{currentUser?.fullName}</Text>
        <Text style={styles.email}>{currentUser?.email}</Text>
        <Text style={styles.phone}>{currentUser?.phone}</Text>
        <Text style={styles.memberSince}>Driver since {memberSince}</Text>
      </View>

      {/* Rating */}
      <View style={styles.ratingSection}>
        <Text style={styles.sectionTitle}>Rating</Text>
        <StarRating rating={currentUser?.rating || 0} />
        <Text style={styles.ratingText}>{(currentUser?.rating || 0).toFixed(1)} / 5.0</Text>
      </View>

      {/* Vehicle Info (No earnings shown!) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Vehicle Information</Text>
        <View style={styles.vehicleRow}>
          <Text style={styles.vehicleIcon}>{vehicleIcon(currentUser?.vehicleType)}</Text>
          <View>
            <Text style={styles.vehicleType}>{currentUser?.vehicleType || 'Not set'}</Text>
            <Text style={styles.vehiclePlate}>{currentUser?.vehiclePlate || 'Plate: N/A'}</Text>
            <Text style={styles.vehicleCapacity}>Capacity: {currentUser?.vehicleCapacity || 'N/A'} seats</Text>
          </View>
        </View>
      </View>

      {/* Total Rides (No earnings!) */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalRides}</Text>
          <Text style={styles.statLabel}>Total Completed Rides</Text>
        </View>
      </View>

      {/* Logout */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          textColor={COLORS.error}
          style={[styles.actionBtn, { borderColor: COLORS.error }]}
          onPress={handleLogout}
        >
          Logout
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: 'white', marginBottom: SPACING.md },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarInitials: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  fullName: { fontSize: FONTS.xxl, fontWeight: 'bold', color: 'white', marginBottom: 4 },
  email: { color: 'rgba(255,255,255,0.75)', fontSize: FONTS.md, marginBottom: 2 },
  phone: { color: 'rgba(255,255,255,0.75)', fontSize: FONTS.md, marginBottom: 2 },
  memberSince: { color: 'rgba(255,255,255,0.6)', fontSize: FONTS.sm, marginTop: 4 },
  ratingSection: {
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
    elevation: 2,
    alignItems: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: { fontSize: FONTS.lg, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.sm },
  ratingText: { color: COLORS.primary, fontWeight: 'bold', fontSize: FONTS.md, marginTop: 4 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  vehicleIcon: { fontSize: 40 },
  vehicleType: { fontSize: FONTS.lg, fontWeight: 'bold', color: COLORS.text, textTransform: 'capitalize' },
  vehiclePlate: { color: COLORS.textSecondary, fontSize: FONTS.md },
  vehicleCapacity: { color: COLORS.textSecondary, fontSize: FONTS.md },
  statsRow: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  statBox: { padding: SPACING.md, alignItems: 'center' },
  statValue: { fontSize: FONTS.xxl, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { color: COLORS.textSecondary, fontSize: FONTS.sm, marginTop: 4 },
  actions: { padding: SPACING.md },
  actionBtn: { borderRadius: 8 },
});

export default DriverProfileScreen;
