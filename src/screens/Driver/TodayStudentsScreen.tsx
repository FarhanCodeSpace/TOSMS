import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Avatar, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { COLORS } from '@constants/theme';
import { format } from 'date-fns';
import { getPakistanTodayString } from '@utils/dateHelpers';
import { useAuth } from '@hooks/useAuth';

const TodayStudentsScreen: React.FC<any> = ({ navigation, route }) => {
  const { routeId: paramRouteId, date: paramDate } = (route.params || {}) as { routeId?: string; date?: string };
  const { currentUser } = useAuth();
  
  const date = paramDate || getPakistanTodayString();
  const [routeId, setRouteId] = useState(paramRouteId || '');

  const [students, setStudents] = useState<any[]>([]);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [routeName, setRouteName] = useState('');
  const [selectedTab, setSelectedTab] = useState<'available' | 'unavailable' | 'noResponse'>('available');

  useEffect(() => {
    if (!paramRouteId && currentUser?.uid) {
      // Auto-fetch driver's route if param is missing
      const fetchDriverRoute = async () => {
        try {
          const q = query(
            collection(db, COLLECTIONS.ROUTES),
            where('assignedDriverId', '==', currentUser.uid)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            setRouteId(snap.docs[0].id);
          } else {
            setLoading(false);
          }
        } catch (error) {
           console.error('Error auto-fetching route:', error);
           setLoading(false);
        }
      };
      fetchDriverRoute();
    }
  }, [paramRouteId, currentUser?.uid]);

  useEffect(() => {
    if (!routeId) return;
    const loadData = async () => {
      try {
        setLoading(true);
        // 1. Fetch route document
        const routeSnap = await getDoc(doc(db, COLLECTIONS.ROUTES, routeId));
        if (!routeSnap.exists()) {
          setLoading(false);
          return;
        }
        const routeData = routeSnap.data();
        setRouteName(routeData.routeName || '');
        const studentIds: string[] = routeData.studentIds || [];

        // 2. Fetch all student user documents
        const studentDocs = await Promise.all(
          studentIds.map(uid => getDoc(doc(db, COLLECTIONS.USERS, uid)))
        );
        const studentList = studentDocs
          .filter(d => d.exists())
          .map(d => ({ uid: d.id, ...d.data() }));
        setStudents(studentList);

        // 3. Set up real-time availability listeners for each student
        const unsubscribers: (() => void)[] = [];
        studentIds.forEach(uid => {
          const availDocId = uid + '_' + date;
          const unsub = onSnapshot(
            doc(db, COLLECTIONS.AVAILABILITY, availDocId),
            (snap) => {
              setAvailabilityMap(prev => ({
                ...prev,
                [uid]: snap.exists() ? snap.data() : null
              }));
            }
          );
          unsubscribers.push(unsub);
        });

        setLoading(false);
        return () => unsubscribers.forEach(fn => fn());
      } catch (error) {
        console.error('TodayStudentsScreen error:', error);
        setLoading(false);
      }
    };
    loadData();
  }, [routeId, date]);

  const availableStudents = students.filter(s =>
    availabilityMap[s.uid] !== undefined &&
    availabilityMap[s.uid] !== null &&
    availabilityMap[s.uid]?.isAvailable === true
  );
  
  const unavailableStudents = students.filter(s =>
    availabilityMap[s.uid] !== undefined &&
    availabilityMap[s.uid] !== null &&
    availabilityMap[s.uid]?.isAvailable === false
  );
  
  const noResponseStudents = students.filter(s =>
    availabilityMap[s.uid] === undefined ||
    availabilityMap[s.uid] === null
  );

  const currentList = selectedTab === 'available' ? availableStudents
    : selectedTab === 'unavailable' ? unavailableStudents
    : noResponseStudents;

  const totalCount = students.length;
  const availableCount = availableStudents.length;
  const progress = totalCount > 0 ? availableCount / totalCount : 0;
  
  const renderStudentCard = ({ item }: { item: any }) => {
    const status = availabilityMap[item.uid];
    const initials = item.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
    
    let accentColor = '#D1D5DB';
    let avatarBg = '#F3F4F6';
    let statusText = 'No Response';
    let statusBg = '#F3F4F6';
    let statusTextColor = '#6B7280';

    if (status?.isAvailable) {
      accentColor = '#16A34A';
      avatarBg = '#DCFCE7';
      statusText = 'Available';
      statusBg = '#F0FFF4';
      statusTextColor = '#16A34A';
      if (status.boarded) {
        statusText = 'Boarded';
        statusBg = '#EFF6FF';
        statusTextColor = '#1A3C5E';
      }
    } else if (status?.isAvailable === false) {
      accentColor = '#DC2626';
      avatarBg = '#FEE2E2';
      statusText = 'Not Available';
      statusBg = '#FFF0F0';
      statusTextColor = '#DC2626';
    }

    return (
      <View style={styles.card}>
        <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />
        <View style={styles.cardContent}>
          {item.profileImageUrl ? (
            <Avatar.Image size={42} source={{ uri: item.profileImageUrl }} />
          ) : (
            <Avatar.Text size={42} label={initials} style={{ backgroundColor: avatarBg }} labelStyle={{ color: statusTextColor }} />
          )}
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.fullName}</Text>
            <View style={styles.stopRow}>
              <MaterialCommunityIcons name="map-marker" size={13} color={COLORS.textSecondary} />
              <Text style={styles.stopText}>{item.pickupStop || 'No pickup stop'}</Text>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusPillText, { color: statusTextColor }]}>{statusText}</Text>
          </View>
        </View>
      </View>
    );
  };

  const formattedDate = format(new Date(date), 'EEEE, MMMM d');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Students</Text>
          <Text style={styles.headerSubtitle}>{formattedDate}</Text>
        </View>
      </View>

      {/* Progress Card */}
      <View style={styles.progressCard}>
        <Text style={styles.progressText}>{availableCount} of {totalCount} available today</Text>
        <ProgressBar progress={progress} color="#16A34A" style={styles.progressBar} />
      </View>

      {/* Tab Row */}
      <View style={styles.tabRow}>
        <TouchableOpacity 
          style={[styles.tabPill, selectedTab === 'available' ? styles.tabPillAvailable : styles.tabPillInactive]}
          onPress={() => setSelectedTab('available')}
        >
          <Text style={[styles.tabPillText, selectedTab === 'available' ? styles.tabPillTextActive : styles.tabPillTextInactive]}>
            Available ({availableStudents.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabPill, selectedTab === 'unavailable' ? styles.tabPillUnavailable : styles.tabPillInactive]}
          onPress={() => setSelectedTab('unavailable')}
        >
          <Text style={[styles.tabPillText, selectedTab === 'unavailable' ? styles.tabPillTextActive : styles.tabPillTextInactive]}>
            Not Available ({unavailableStudents.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabPill, selectedTab === 'noResponse' ? styles.tabPillNoResponse : styles.tabPillInactive]}
          onPress={() => setSelectedTab('noResponse')}
        >
          <Text style={[styles.tabPillText, selectedTab === 'noResponse' ? styles.tabPillTextActive : styles.tabPillTextInactive]}>
            No Response ({noResponseStudents.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        </View>
      ) : !routeId ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="map-marker-off" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>No route assigned</Text>
        </View>
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => item.uid}
          renderItem={renderStudentCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-group" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No students in this category</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { padding: 4, marginRight: 16 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: 'white' },
  headerSubtitle: { fontSize: 13, color: 'white', opacity: 0.7 },
  progressCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: -10,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
  },
  progressText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  progressBar: { height: 8, borderRadius: 4, marginTop: 10 },
  tabRow: {
    marginHorizontal: 16,
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  tabPill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  tabPillInactive: { backgroundColor: 'white', borderColor: '#E5E7EB' },
  tabPillAvailable: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  tabPillUnavailable: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  tabPillNoResponse: { backgroundColor: '#6B7280', borderColor: '#6B7280' },
  tabPillText: { fontSize: 11, fontWeight: '600' },
  tabPillTextActive: { color: 'white' },
  tabPillTextInactive: { color: COLORS.textSecondary },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30 },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
    position: 'relative',
  },
  cardAccent: {
    width: 3,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingLeft: 17,
  },
  studentInfo: { flex: 1, marginLeft: 12 },
  studentName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  stopRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  stopText: { fontSize: 12, color: COLORS.textSecondary },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loader: { marginTop: 40 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 12 },
});

export default TodayStudentsScreen;
