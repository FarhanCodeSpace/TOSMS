import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Animated, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Searchbar, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { doc, getDoc, onSnapshot, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { COLORS, SPACING } from '@constants/theme';
import { getPakistanTodayString } from '@utils/dateHelpers';
import { Route, User, Availability } from '@types';

interface StudentWithAvailability {
  uid: string;
  fullName: string;
  pickupStop?: string;
  availability: 'available' | 'unavailable' | 'no-response';
  boarded: boolean;
}

export const PassengersScreen: React.FC<any> = ({ route, navigation }) => {
  const { routeId } = route.params as { routeId: string; rideId?: string };

  const [routeData, setRouteData] = useState<Route | null>(null);
  const [students, setStudents] = useState<StudentWithAvailability[]>([]);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

  const todayStr = getPakistanTodayString();

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    const fetchData = async () => {
      try {
        const routeRef = doc(db, COLLECTIONS.ROUTES, routeId);
        const routeSnap = await getDoc(routeRef);
        if (!routeSnap.exists()) { setIsLoading(false); return; }

        const rd = routeSnap.data() as Route;
        setRouteData(rd);
        const studentIds = rd.studentIds || [];
        if (studentIds.length === 0) { setIsLoading(false); return; }

        const studentDocs = await Promise.all(
          studentIds.map((uid: string) => getDoc(doc(db, COLLECTIONS.USERS, uid)))
        );
        const studentList = studentDocs
          .filter(d => d.exists())
          .map(d => ({
            uid: d.id,
            fullName: (d.data() as any).fullName || 'Unknown',
            pickupStop: (d.data() as any).pickupStop || 'Not assigned',
            availability: 'no-response',
            boarded: false,
          } as StudentWithAvailability));
        setStudents(studentList);

        // Set up listeners OUTSIDE async, pushed to unsubscribers array
        const auth = getAuth();
        studentIds.forEach((uid: string) => {
          const availDocId = uid + '_' + todayStr;
          const unsub = onSnapshot(
            doc(db, COLLECTIONS.AVAILABILITY, availDocId),
            (snap) => {
              if (!auth.currentUser) return;
              setAvailabilityMap(prev => ({
                ...prev,
                [uid]: snap.exists() ? snap.data() : null
              }));
            },
            (error: any) => {
              if (error.code === 'permission-denied') return;
              console.error("Student availability listener error:", error);
            }
          );
          unsubscribers.push(unsub);
        });

        setIsLoading(false);
      } catch (error) {
        console.error('Error:', error);
        setIsLoading(false);
      }
    };

    fetchData();

    // Cleanup runs correctly now
    return () => {
      unsubscribers.forEach(fn => fn());
    };
  }, [routeId, todayStr]);

  const handleMarkBoarded = async (studentUid: string) => {
    try {
      const today = getPakistanTodayString();
      const docId = studentUid + '_' + today;
      const docRef = doc(db, COLLECTIONS.AVAILABILITY, docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await updateDoc(docRef, {
          boarded: true,
          boardedAt: serverTimestamp()
        });
      } else {
        await setDoc(docRef, {
          userId: studentUid,
          boarded: true,
          boardedAt: serverTimestamp(),
          date: today,
          routeId: routeId || '',
          isAvailable: true,
          role: 'student'
        });
      }
      console.log('Boarded marked for:', studentUid);
      setTimeout(() => {
        swipeableRefs.current[studentUid]?.close();
      }, 300);
    } catch (error) {
      console.error('Error marking boarded:', error);
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getAvailabilityBadge = (status: string) => {
    switch (status) {
      case 'available':
        return { label: 'Available', color: '#16A34A', bg: '#F0FFF4' };
      case 'unavailable':
        return { label: 'Not Available', color: '#DC2626', bg: '#FFF0F0' };
      default:
        return { label: 'No Response', color: COLORS.textSecondary, bg: '#F3F4F6' };
    }
  };

  const filteredStudents = students.filter(s =>
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const boardedCount = students.filter(s =>
    availabilityMap[s.uid]?.boarded === true
  ).length;
  
  const availableCount = students.filter(s =>
    availabilityMap[s.uid]?.isAvailable === true &&
    !availabilityMap[s.uid]?.boarded
  ).length;
  
  const unavailableCount = students.filter(s =>
    availabilityMap[s.uid]?.isAvailable === false
  ).length;

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    uid: string
  ) => {
    if (availabilityMap[uid]?.boarded) return null;

    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.8, 1],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={{
          opacity,
          transform: [{ scale }],
          backgroundColor: '#16A34A',
          justifyContent: 'center',
          alignItems: 'center',
          width: 85,
          marginVertical: 4,
          marginLeft: 8,
          borderRadius: 12,
        }}
      >
        <MaterialCommunityIcons name="check-bold" size={24} color="white" />
        <Text style={{ color: 'white', fontSize: 11, fontWeight: '700', marginTop: 4 }}>
          Boarded
        </Text>
      </Animated.View>
    );
  };

  const renderItem = ({ item }: { item: StudentWithAvailability }) => {
    const isBoarded = availabilityMap[item.uid]?.boarded === true;
    const isAvailable = availabilityMap[item.uid]?.isAvailable === true;
    const isUnavailable = availabilityMap[item.uid]?.isAvailable === false;
    
    let badge = getAvailabilityBadge('no-response');
    if (isAvailable) badge = getAvailabilityBadge('available');
    if (isUnavailable) badge = getAvailabilityBadge('unavailable');

    return (
      <Swipeable
        ref={(ref) => { swipeableRefs.current[item.uid] = ref; }}
        friction={2}
        leftThreshold={80}
        rightThreshold={50}
        overshootRight={false}
        overshootFriction={8}
        useNativeAnimations={true}
        renderRightActions={(prog, drag) => renderRightActions(prog as Animated.AnimatedInterpolation<number>, drag as Animated.AnimatedInterpolation<number>, item.uid)}
        enabled={!isBoarded && isAvailable}
        onSwipeableOpen={(direction) => {
          if (direction === 'right') {
            handleMarkBoarded(item.uid);
          }
        }}
      >
        <View style={[styles.studentCard, isBoarded && styles.studentCardBoarded]}>
          <Avatar.Text
            size={42}
            label={getInitials(item.fullName)}
            style={{ backgroundColor: isBoarded ? COLORS.success : COLORS.primary }}
          />
          <View style={styles.studentInfo}>
            <Text style={styles.studentName} numberOfLines={1}>{item.fullName}</Text>
            <View style={styles.pickupRow}>
              <MaterialCommunityIcons name="map-marker" size={14} color={COLORS.textSecondary} />
              <Text style={styles.pickupText}>{item.pickupStop}</Text>
            </View>
          </View>
          <View style={styles.statusContainer}>
            {isBoarded ? (
              <View style={[styles.badge, { backgroundColor: COLORS.success }]}>
                <MaterialCommunityIcons name="check" size={12} color="white" />
                <Text style={styles.badgeTextWhite}>Boarded</Text>
              </View>
            ) : (
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            )}
          </View>
        </View>
      </Swipeable>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Passengers</Text>
          <Text style={styles.headerSubtitle}>
            {routeData?.routeName || '...'} — {todayStr}
          </Text>
        </View>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: '#16A34A' }]}>{availableCount}</Text>
          <Text style={styles.summaryLabel}>Available</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: COLORS.primary }]}>{boardedCount}</Text>
          <Text style={styles.summaryLabel}>Boarded</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: COLORS.textSecondary }]}>{unavailableCount}</Text>
          <Text style={styles.summaryLabel}>Not Available</Text>
        </View>
      </View>

      {/* Search Bar */}
      <Searchbar
        placeholder="Search by name..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        elevation={1}
      />

      {/* Student List */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.uid}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-off" size={48} color={COLORS.textSecondary} style={{ opacity: 0.3 }} />
              <Text style={styles.emptyText}>No passengers found</Text>
            </View>
          }
        />
      )}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: SPACING.md,
    borderRadius: 12,
    padding: SPACING.md,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  searchbar: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: 'white',
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: SPACING.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  studentCardBoarded: {
    backgroundColor: '#F9FAFB',
    opacity: 0.8,
  },
  studentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  pickupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  pickupText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusContainer: {
    marginLeft: SPACING.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextWhite: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  rightActionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    marginBottom: SPACING.sm,
    borderRadius: 12,
    width: 100,
  },
  boardedActionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginTop: 8,
  },
});

export default PassengersScreen;
