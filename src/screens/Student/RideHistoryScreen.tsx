import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@hooks/useAuth';
import { COLORS, SPACING, FONTS } from '@constants/theme';
import { format, parseISO } from 'date-fns';
import { getDoc, doc } from 'firebase/firestore';
import { Availability } from '../../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAuth } from "firebase/auth";

interface AvailabilityWithId extends Availability {
  availabilityId: string;
}

export const RideHistoryScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState<AvailabilityWithId[]>([]);
  const [routeName, setRouteName] = useState('Loading...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.routeId) {
      setRouteName('No Route');
      return;
    }
    const fetchRoute = async () => {
      try {
        const routeSnap = await getDoc(doc(db, COLLECTIONS.ROUTES, currentUser.routeId));
        if (routeSnap.exists()) {
          setRouteName(routeSnap.data().routeName);
        }
      } catch (err) {
        console.error('Error fetching route:', err);
      }
    };
    fetchRoute();
  }, [currentUser?.routeId]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const q = query(
      collection(db, COLLECTIONS.AVAILABILITY),
      where('userId', '==', currentUser.uid),
      where('date', '<', today),
      orderBy('date', 'desc')
    );

    const auth = getAuth();
    const unsub = onSnapshot(
      q, 
      (snap) => {
        if (!auth.currentUser) return;
        const data: AvailabilityWithId[] = snap.docs.map(d => ({
          availabilityId: d.id,
          ...(d.data() as Availability),
        }));
        setRecords(data);
        setLoading(false);
      },
      (error: any) => {
        if (error.code === 'permission-denied') return;
        console.error("Ride history listener error:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [currentUser?.uid]);

  const totalRides = records.filter(r => r.isAvailable).length;

  const renderItem = ({ item }: { item: AvailabilityWithId }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardRow}>
          <View>
            <Text style={styles.dateText}>
              {format(parseISO(item.date), 'EEEE, MMM d, yyyy')}
            </Text>
            <Text style={styles.routeText}>
              {routeName}
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.isAvailable ? '#DCFCE7' : '#F3F4F6' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.isAvailable ? '#16A34A' : '#6B7280' }
            ]}>
              {item.isAvailable ? 'Rode ✓' : 'Did Not Ride'}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>My Ride History</Text>
        <Text style={styles.statsValue}>{totalRides} rides taken</Text>
      </View>

      <FlatList
        data={records}
        keyExtractor={item => item.availabilityId}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="history" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No ride history yet</Text>
            <Text style={styles.emptySubtitle}>Your availability history will appear here.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsCard: { backgroundColor: COLORS.primary, padding: SPACING.lg, paddingTop: 60 },
  statsTitle: { color: 'rgba(255,255,255,0.75)', fontSize: FONTS.md },
  statsValue: { color: 'white', fontSize: FONTS.xxl, fontWeight: 'bold', marginTop: 4 },
  listContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  card: { marginBottom: SPACING.md, backgroundColor: COLORS.surface, elevation: 2, borderRadius: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: FONTS.md, fontWeight: 'bold', color: COLORS.text },
  routeText: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 2 },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: FONTS.xl, fontWeight: 'bold', color: COLORS.textSecondary, marginTop: 12 },
  emptySubtitle: { color: COLORS.textSecondary, fontSize: FONTS.md, marginTop: 4, textAlign: 'center', paddingHorizontal: SPACING.lg },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default RideHistoryScreen;
