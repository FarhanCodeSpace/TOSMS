import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@hooks/useAuth';
import { COLORS, SPACING, FONTS } from '@constants/theme';
import { formatDistanceToNow } from 'date-fns';
import { StackScreenProps } from '@react-navigation/stack';
import { StudentProfileStackParamList } from '@navigation/types';

type StudentProfileScreenProps = StackScreenProps<StudentProfileStackParamList, 'StudentProfile'>;

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  const first = parts[0]?.[0] || '';
  const last = parts[parts.length - 1]?.[0] || '';
  return (first + last).toUpperCase();
};

export const StudentProfileScreen: React.FC<StudentProfileScreenProps> = ({ navigation }) => {
  const { currentUser, logout } = useAuth();
  const [totalRides, setTotalRides] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser?.uid) return;
      try {
        const q = query(
          collection(db, COLLECTIONS.BOOKINGS),
          where('studentId', '==', currentUser.uid),
          where('status', '==', 'completed')
        );
        const snap = await getDocs(q);
        setTotalRides(snap.size);
        const spent = snap.docs.reduce((sum, d) => sum + (d.data().fareAmount || 0), 0);
        setTotalSpent(spent);
      } catch (error) {
        console.error('Error fetching stats:', error);
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
        <Text style={styles.memberSince}>Member since {memberSince}</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalRides}</Text>
          <Text style={styles.statLabel}>Total Rides</Text>
        </View>
        <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: '#E0E0E0' }]}>
          <Text style={styles.statValue}>PKR {totalSpent.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Spent</Text>
        </View>
      </View>

      {/* Menu Options */}
      <View style={styles.menuSection}>
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => (navigation as any).navigate('PaymentHistory')}
        >
          <View style={styles.menuItemLeft}>
            <View style={styles.menuIconBox}>
              <Icon name="history" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.menuItemText}>Payment History</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#D1D5DB" />
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          buttonColor={COLORS.primary}
          style={styles.actionBtn}
          onPress={() => navigation.navigate('EditProfile')}
        >
          Edit Profile
        </Button>
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
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  statBox: { flex: 1, padding: SPACING.md, alignItems: 'center' },
  statValue: { fontSize: FONTS.xxl, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { color: COLORS.textSecondary, fontSize: FONTS.sm, marginTop: 4 },
  menuSection: { marginTop: SPACING.lg, marginHorizontal: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 12, elevation: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  menuItemText: { fontSize: FONTS.md, fontWeight: '600', color: COLORS.text },
  actions: { padding: SPACING.md, gap: SPACING.md, marginTop: SPACING.sm },
  actionBtn: { borderRadius: 8 },
});

export default StudentProfileScreen;
