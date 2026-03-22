import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useAuth } from '@hooks/useAuth';
import { COLORS, FONTS } from '@constants/theme';
import { formatDistanceToNow, format } from 'date-fns';
import { TouchableOpacity } from 'react-native-gesture-handler';

const getInitials = (name: string): string => {
  if (!name) return '';
  const parts = name.trim().split(' ');
  const first = parts[0]?.[0] || '';
  const last = parts[parts.length - 1]?.[0] || '';
  return (first + last).toUpperCase();
};

const getVehicleIcon = (type?: string): any => {
  const t = type?.toLowerCase() || '';
  if (t === 'van') return 'van-utility';
  if (t === 'bus') return 'bus';
  if (t === 'coaster') return 'bus-side';
  return 'car-info';
};

const formatTime = (time: any) => {
  if (!time) return 'N/A';
  if (typeof time === 'string') return time;
  if (time.toDate) return format(time.toDate(), 'h:mm a');
  if (time instanceof Date) return format(time, 'h:mm a');
  return String(time);
};

export const DriverProfileScreen: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [totalRides, setTotalRides] = useState(0);
  const [route, setRoute] = useState<any>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);

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

    const fetchRoute = async () => {
      if (!currentUser?.uid) return;
      try {
        const q = query(
          collection(db, COLLECTIONS.ROUTES),
          where('assignedDriverId', '==', currentUser.uid),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setRoute(snap.docs[0].data());
        } else {
          setRoute(null);
        }
      } catch (error) {
        console.error('Error fetching driver route:', error);
      } finally {
        setLoadingRoute(false);
      }
    };

    fetchStats();
    fetchRoute();
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
      {/* Header Section */}
      <View style={styles.header}>
        {avatarSource ? (
          <Image source={{ uri: avatarSource }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{getInitials(currentUser?.fullName || '')}</Text>
          </View>
        )}
        <Text style={styles.fullName}>{currentUser?.fullName}</Text>
        
        <View style={styles.contactRow}>
          <MaterialCommunityIcons name="email-outline" size={14} color="white" style={{ opacity: 0.7 }} />
          <Text style={styles.contactText}>{currentUser?.email}</Text>
        </View>

        <View style={styles.contactRow}>
          <MaterialCommunityIcons name="phone-outline" size={14} color="white" style={{ opacity: 0.7 }} />
          <Text style={styles.contactText}>{currentUser?.phone}</Text>
        </View>

        <Text style={styles.memberSince}>Driver since {memberSince}</Text>
      </View>

      <View style={styles.contentArea}>
        {/* Status Cards Row */}
        <View style={styles.statusCardsRow}>
          {/* Rating */}
          <View style={styles.statusCol}>
            <MaterialCommunityIcons name="star" size={20} color="#F59E0B" />
            <Text style={styles.statusValue}>{(currentUser?.rating || 0).toFixed(1)}</Text>
            <Text style={styles.statusLabel}>Rating</Text>
          </View>
          
          <Divider style={styles.statusDivider} />
          
          {/* Rides Done */}
          <View style={styles.statusCol}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#16A34A" />
            <Text style={styles.statusValue}>{totalRides}</Text>
            <Text style={styles.statusLabel}>Rides Done</Text>
          </View>
          
          <Divider style={styles.statusDivider} />

          {/* Route Count / Assigned */}
          <View style={styles.statusCol}>
            <MaterialCommunityIcons name="map-marker-path" size={20} color={COLORS.primary} />
            <Text style={styles.statusValue}>{route ? '1' : '0'}</Text>
            <Text style={styles.statusLabel}>Route</Text>
          </View>
        </View>

        {/* Vehicle Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="car-info" size={18} color={COLORS.primary} />
            <Text style={styles.cardHeaderTitle}>Vehicle Information</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Type</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons 
                  name={getVehicleIcon(currentUser?.vehicleType)} 
                  size={16} 
                  color={COLORS.text} 
                  style={{ marginRight: 4 }} 
                />
                <Text style={styles.infoValue}>
                  {currentUser?.vehicleType ? currentUser.vehicleType.charAt(0).toUpperCase() + currentUser.vehicleType.slice(1) : 'Not set'}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Plate</Text>
              <Text style={styles.infoValue}>{currentUser?.vehiclePlate || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Capacity</Text>
              <Text style={styles.infoValue}>{currentUser?.vehicleCapacity || '0'} seats</Text>
            </View>
          </View>
        </View>

        {/* Route Card */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="map-marker-path" size={18} color={COLORS.primary} />
            <Text style={styles.cardHeaderTitle}>My Route</Text>
          </View>
          <View style={styles.cardContent}>
            {loadingRoute ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : route ? (
              <View>
                <Text style={styles.routeName}>{route.routeName || route.name}</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Departure</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={COLORS.text} style={{ marginRight: 4 }} />
                    <Text style={styles.infoValue}>{formatTime(route.departureTime)}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Return</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={COLORS.text} style={{ marginRight: 4 }} />
                    <Text style={styles.infoValue}>{formatTime(route.returnTime)}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={styles.noRouteText}>No route assigned</Text>
            )}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <MaterialCommunityIcons name="logout" size={18} color="#DC2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  header: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  avatar: { 
    width: 88, 
    height: 88, 
    borderRadius: 44, 
    borderWidth: 3, 
    borderColor: 'white', 
    marginBottom: 12 
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarInitials: { 
    color: 'white', 
    fontSize: 32, 
    fontWeight: 'bold' 
  },
  fullName: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: 'white', 
    marginBottom: 6 
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    color: 'white',
    opacity: 0.7,
    fontSize: 13,
    marginLeft: 6,
  },
  memberSince: { 
    color: 'white', 
    opacity: 0.5, 
    fontSize: 12, 
    marginTop: 6 
  },
  contentArea: {
    backgroundColor: '#F8F9FA',
  },
  statusCardsRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusCol: {
    flex: 1,
    alignItems: 'center',
  },
  statusDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#F0F0F0',
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  statusLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 6,
  },
  cardContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  routeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  noRouteText: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 8,
  },
});

export default DriverProfileScreen;
