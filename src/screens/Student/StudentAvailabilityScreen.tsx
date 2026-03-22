import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '@hooks/useAuth';
import { COLORS } from '@constants/theme';
import { getPakistanTomorrowString, formatPakistanDate } from '@utils/dateHelpers';
import { StackNavigationProp } from '@react-navigation/stack';
import { StudentHomeStackParamList } from '@navigation/types';

type StudentAvailabilityScreenProps = {
  navigation: StackNavigationProp<StudentHomeStackParamList, 'StudentHome'>;
};

const StudentAvailabilityScreen: React.FC<StudentAvailabilityScreenProps> = ({ navigation }) => {
  const { currentUser } = useAuth();
  
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const tomorrowString = getPakistanTomorrowString();
  const tomorrowDisplay = formatPakistanDate(tomorrowString);

  useEffect(() => {
    fetchCurrentAvailability();
  }, [currentUser?.uid]);

  const fetchCurrentAvailability = async () => {
    if (!currentUser?.uid) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, COLLECTIONS.AVAILABILITY),
        where('userId', '==', currentUser.uid),
        where('date', '==', tomorrowString)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setIsAvailable(data.isAvailable);
        setReason(data.note || '');
      }
    } catch (e) {
      console.error('Error fetching availability:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (isAvailable === null) {
      Alert.alert('Selection Required', 'Please select whether you are available or not.');
      return;
    }
    
    if (!currentUser?.uid) return;
    
    setIsSaving(true);
    try {
      const docId = currentUser.uid + '_' + tomorrowString;
      const docRef = doc(db, COLLECTIONS.AVAILABILITY, docId);
      
      await setDoc(docRef, {
        availabilityId: docId,
        userId: currentUser.uid,
        userName: currentUser.fullName,
        routeId: currentUser.routeId || '',
        date: tomorrowString,
        isAvailable: isAvailable,
        note: reason,
        markedAt: serverTimestamp(),
        role: 'student'
      });
      
      Alert.alert('Success', 'Availability marked successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error('Error saving availability:', e);
      Alert.alert('Error', 'Failed to save availability. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Back Button ── */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.text} />
        </TouchableOpacity>

        {/* ── Date Card ── */}
        <View style={styles.dateCard}>
          <MaterialCommunityIcons name="calendar-clock" size={24} color="white" />
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateLabel}>Tomorrow's Availability</Text>
            <Text style={styles.dateValue}>{tomorrowDisplay}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Will you be using the transport?</Text>

        {/* ── Selection Cards ── */}
        <View style={styles.selectionContainer}>
          <TouchableOpacity 
            style={[
              styles.choiceCard,
              isAvailable === true && styles.choiceCardSelectedAvailable
            ]}
            onPress={() => setIsAvailable(true)}
          >
            <MaterialCommunityIcons 
              name={isAvailable === true ? "check-circle" : "check-circle-outline"} 
              size={32} 
              color={isAvailable === true ? "#16A34A" : COLORS.textSecondary} 
            />
            <View style={styles.choiceTextContainer}>
                <Text style={[styles.choiceText, isAvailable === true && styles.choiceTextSelectedAvailable]}>
                Available
                </Text>
                <Text style={styles.choiceSub}>I will be using transport tomorrow</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.choiceCard,
              isAvailable === false && styles.choiceCardSelectedUnavailable
            ]}
            onPress={() => setIsAvailable(false)}
          >
            <MaterialCommunityIcons 
              name={isAvailable === false ? "close-circle" : "close-circle-outline"} 
              size={32} 
              color={isAvailable === false ? "#DC2626" : COLORS.textSecondary} 
            />
            <View style={styles.choiceTextContainer}>
                <Text style={[styles.choiceText, isAvailable === false && styles.choiceTextSelectedUnavailable]}>
                Not Available
                </Text>
                <Text style={styles.choiceSub}>I won't need transport tomorrow</Text>
            </View>
          </TouchableOpacity>
        </View>

        {isAvailable === false && (
          <View style={styles.alertBox}>
            <MaterialCommunityIcons name="information" size={20} color="#92400E" />
            <Text style={styles.alertText}>
              Your driver will be notified that you won't need pickup tomorrow.
            </Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Reason or Note (Optional)</Text>
          <TextInput
            mode="outlined"
            placeholder="e.g. Personal holiday, exam, etc."
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            style={styles.textInput}
            outlineColor="#E5E7EB"
            activeOutlineColor={COLORS.primary}
          />
        </View>
      </ScrollView>

      {/* ── Action Button ── */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={isSaving}
          disabled={isSaving || isAvailable === null}
          style={styles.confirmBtn}
          contentStyle={styles.confirmBtnContent}
          buttonColor={COLORS.primary}
        >
          Confirm Availability
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateCard: {
    backgroundColor: '#1A3C5E',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dateTextContainer: {
    marginLeft: 16,
  },
  dateLabel: {
    color: 'white',
    fontSize: 14,
    opacity: 0.8,
  },
  dateValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    paddingLeft: 4,
  },
  selectionContainer: {
    gap: 12,
    marginBottom: 20,
  },
  choiceCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  choiceCardSelectedAvailable: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FFF4',
  },
  choiceCardSelectedUnavailable: {
    borderColor: '#DC2626',
    backgroundColor: '#FFF5F5',
  },
  choiceTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  choiceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  choiceSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  choiceTextSelectedAvailable: {
    color: '#16A34A',
  },
  choiceTextSelectedUnavailable: {
    color: '#DC2626',
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginTop: 12,
  },
  alertText: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
  },
  inputContainer: {
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 10,
    paddingLeft: 4,
  },
  textInput: {
    backgroundColor: 'white',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  confirmBtn: {
    borderRadius: 12,
  },
  confirmBtnContent: {
    paddingVertical: 8,
  },
});

export default StudentAvailabilityScreen;
