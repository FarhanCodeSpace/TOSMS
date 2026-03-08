import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@hooks/useAuth';
import { COLORS, SPACING, FONTS } from '@constants/theme';
import { format, parseISO } from 'date-fns';
import { Availability } from '../../types';

interface AvailabilityWithId extends Availability {
  availabilityId: string;
}

export const RideHistoryScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState<AvailabilityWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const q = query(
      collection(db, COLLECTIONS.AVAILABILITY),
      where('userId', '==', currentUser.uid),
      where('date', '<', today),
      orderBy('date', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data: AvailabilityWithId[] = snap.docs.map(d => ({
        availabilityId: d.id,
        ...(d.data() as Availability),
      }));
      setRecords(data);
      setLoading(false);
    });

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
              {item.routeId ? 'Route Assigned' : 'No Route'}
            </Text>
          </View>
          <Chip
            style={{ backgroundColor: item.isAvailable ? COLORS.success : COLORS.error }}
            textStyle={{ color: 'white', fontSize: 11 }}
          >
            {item.isAvailable ? 'Rode' : 'Absent'}
          </Chip>
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
            <Text style={{ fontSize: 48 }}>🚗</Text>
            <Text style={styles.emptyTitle}>No ride history yet</Text>
            <Text style={styles.emptySubtitle}>Your past availability marks will appear here.</Text>
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
});

export default RideHistoryScreen;
