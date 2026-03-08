import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { COLORS, SPACING, FONTS } from '@constants/theme';
import { format, isToday, isTomorrow } from 'date-fns';
import { StackScreenProps } from '@react-navigation/stack';
import { StudentHomeStackParamList } from '@navigation/types';

type RideDetailScreenProps = StackScreenProps<StudentHomeStackParamList, 'RideDetail'>;

interface RideData {
  routeName: string;
  driverName: string;
  driverPhone: string;
  driverRating: number;
  driverProfileImageUrl?: string;
  departureTime: Timestamp;
  availableSeats: number;
  totalSeats: number;
  farePerSeat: number;
  stops: { stopName: string; order: number }[];
  startLocation: { name: string; latitude: number; longitude: number };
  endLocation: { name: string; latitude: number; longitude: number };
}

const formatDepartureTime = (ts: Timestamp): string => {
  const date = ts.toDate();
  const timeStr = format(date, 'h:mm a');
  if (isToday(date)) return `Today at ${timeStr}`;
  if (isTomorrow(date)) return `Tomorrow at ${timeStr}`;
  return format(date, 'MMM d') + ` at ${timeStr}`;
};

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Text key={i} style={{ fontSize: 16, color: i <= Math.round(rating) ? COLORS.accent : '#D0D0D0' }}>
          ★
        </Text>
      ))}
    </View>
  );
};

export const RideDetailScreen: React.FC<RideDetailScreenProps> = ({ route, navigation }) => {
  const { rideId } = route.params;
  const [ride, setRide] = useState<RideData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRide = async () => {
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.RIDES, rideId));
        if (snap.exists()) {
          setRide(snap.data() as RideData);
        }
      } catch (error) {
        console.error('Error fetching ride:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRide();
  }, [rideId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Ride not found.</Text>
      </View>
    );
  }

  const allMapCoords = [
    { latitude: ride.startLocation.latitude, longitude: ride.startLocation.longitude },
    { latitude: ride.endLocation.latitude, longitude: ride.endLocation.longitude },
  ];

  const initials = ride.driverName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Map */}
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: (ride.startLocation.latitude + ride.endLocation.latitude) / 2,
            longitude: (ride.startLocation.longitude + ride.endLocation.longitude) / 2,
            latitudeDelta: Math.abs(ride.startLocation.latitude - ride.endLocation.latitude) * 2 + 0.05,
            longitudeDelta: Math.abs(ride.startLocation.longitude - ride.endLocation.longitude) * 2 + 0.05,
          }}
        >
          <Marker coordinate={{ latitude: ride.startLocation.latitude, longitude: ride.startLocation.longitude }} pinColor="green" title="Start" description={ride.startLocation.name} />
          <Marker coordinate={{ latitude: ride.endLocation.latitude, longitude: ride.endLocation.longitude }} pinColor="red" title="End" description={ride.endLocation.name} />
          <Polyline coordinates={allMapCoords} strokeColor={COLORS.primary} strokeWidth={4} />
        </MapView>

        {/* Route Title */}
        <View style={styles.section}>
          <Text style={styles.routeTitle}>{ride.routeName}</Text>
          <Text style={styles.timeText}>{formatDepartureTime(ride.departureTime)}</Text>
        </View>

        {/* Driver Card */}
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>{initials}</Text>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{ride.driverName}</Text>
            <StarRating rating={ride.driverRating || 0} />
          </View>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => Linking.openURL(`tel:${ride.driverPhone}`)}
          >
            <Text style={styles.callBtnText}>📞 Call</Text>
          </TouchableOpacity>
        </View>

        {/* Details Row */}
        <View style={styles.detailsRow}>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>Available Seats</Text>
            <Text style={styles.detailValue}>{ride.availableSeats} / {ride.totalSeats}</Text>
          </View>
          <View style={[styles.detailBox, { borderLeftWidth: 1, borderLeftColor: '#E0E0E0' }]}>
            <Text style={styles.detailLabel}>Fare Per Seat</Text>
            <Text style={[styles.detailValue, { color: COLORS.accent }]}>PKR {ride.farePerSeat?.toLocaleString()}</Text>
          </View>
        </View>

        {/* Stops Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Stops</Text>
          <View style={styles.timeline}>
            {/* Start */}
            <View style={styles.timelineItem}>
              <View style={styles.timelineLineStart} />
              <View style={[styles.timelineDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.timelineText}>{ride.startLocation.name}</Text>
            </View>
            {/* Intermediate stops */}
            {ride.stops.sort((a, b) => a.order - b.order).map((stop, i) => (
              <View key={i} style={styles.timelineItem}>
                <View style={styles.timelineLineMiddle} />
                <View style={[styles.timelineDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.timelineText}>{stop.stopName}</Text>
              </View>
            ))}
            {/* End */}
            <View style={styles.timelineItem}>
              <View style={styles.timelineLineEnd} />
              <View style={[styles.timelineDot, { backgroundColor: COLORS.error }]} />
              <Text style={styles.timelineText}>{ride.endLocation.name}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomBarLabel}>Total Fare</Text>
          <Text style={styles.bottomBarPrice}>PKR {ride.farePerSeat?.toLocaleString()}</Text>
        </View>
        <Button
          mode="contained"
          buttonColor={COLORS.accent}
          textColor="white"
          style={styles.bookBtn}
          onPress={() => navigation.navigate('SeatSelection', { rideId, fareAmount: ride.farePerSeat })}
        >
          Book Seat — PKR {ride.farePerSeat?.toLocaleString()}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  map: { height: 220 },
  section: { padding: SPACING.md },
  routeTitle: { fontSize: FONTS.xxl, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
  timeText: { color: COLORS.textSecondary, fontSize: FONTS.md },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
    elevation: 2,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  driverAvatarText: { color: 'white', fontWeight: 'bold', fontSize: FONTS.xl },
  driverInfo: { flex: 1 },
  driverName: { fontSize: FONTS.lg, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  callBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  callBtnText: { color: 'white', fontWeight: 'bold', fontSize: FONTS.sm },
  detailsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    borderRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  detailBox: { flex: 1, padding: SPACING.md, alignItems: 'center' },
  detailLabel: { color: COLORS.textSecondary, fontSize: FONTS.sm, marginBottom: 4 },
  detailValue: { fontSize: FONTS.xl, fontWeight: 'bold', color: COLORS.text },
  sectionTitle: { fontSize: FONTS.lg, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.md },
  timeline: { paddingLeft: SPACING.md },
  timelineItem: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, position: 'relative' },
  timelineLineStart: { position: 'absolute', left: 7, top: 12, width: 2, height: 40, backgroundColor: '#E0E0E0' },
  timelineLineMiddle: { position: 'absolute', left: 7, top: -12, width: 2, height: 52, backgroundColor: '#E0E0E0' },
  timelineLineEnd: { position: 'absolute', left: 7, bottom: 12, width: 2, height: 0, backgroundColor: '#E0E0E0' },
  timelineDot: { width: 16, height: 16, borderRadius: 8, marginRight: SPACING.md },
  timelineText: { fontSize: FONTS.md, color: COLORS.text },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    elevation: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  bottomBarLabel: { color: COLORS.textSecondary, fontSize: FONTS.sm },
  bottomBarPrice: { fontSize: FONTS.xl, fontWeight: 'bold', color: COLORS.primary },
  bookBtn: { borderRadius: 25, paddingHorizontal: SPACING.sm },
});

export default RideDetailScreen;
