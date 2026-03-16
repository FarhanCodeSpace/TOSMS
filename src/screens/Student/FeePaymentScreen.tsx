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
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '@hooks/useAuth';
import { COLORS } from '@constants/theme';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { COMPANY_INFO } from '@constants/companyInfo';
import { collection, query, where, getDocs, doc, setDoc, Timestamp, getDoc, onSnapshot, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import * as Clipboard from 'expo-clipboard';
import { StackNavigationProp } from '@react-navigation/stack';
import { StudentHomeStackParamList } from '@navigation/types';

type FeePaymentScreenProps = {
  navigation: StackNavigationProp<StudentHomeStackParamList, 'FeePayment'>;
};

const FeePaymentScreen: React.FC<FeePaymentScreenProps> = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feeAmount, setFeeAmount] = useState<number>(0);
  const [routeName, setRouteName] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  
  const [selectedMethod, setSelectedMethod] = useState<'bank' | 'easypaisa' | 'jazzcash' | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentMonthDisplay = format(new Date(), 'MMMM yyyy');

  useEffect(() => {
    const cleanup = fetchData();
    return () => {
      cleanup.then(unsub => unsub?.());
    };
  }, []);

  const fetchData = async () => {
    if (!currentUser?.uid) return;
    try {
      // 1. Fee Status Listener (Real-time)
      const feeQuery = query(
        collection(db, COLLECTIONS.FEE_PAYMENTS),
        where('studentId', '==', currentUser.uid),
        where('month', '==', currentMonth),
        limit(1)
      );

      const unsubscribeFee = onSnapshot(feeQuery, (snapshot) => {
        if (!snapshot.empty) {
          setPaymentStatus({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        } else {
          setPaymentStatus(null);
        }
      });

      // 2. Fetch Route Fee Amount (One-time)
      if (currentUser.routeId) {
        const routeDoc = await getDoc(doc(db, COLLECTIONS.ROUTES, currentUser.routeId));
        if (routeDoc.exists()) {
          setFeeAmount(routeDoc.data().feeAmount || 0);
          setRouteName(routeDoc.data().routeName || '');
        }
      }

      return () => unsubscribeFee();
    } catch (error) {
      console.error('Error fetching fee data:', error);
      Alert.alert('Error', 'Failed to load fee information.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateChallan = async () => {
    if (!currentUser?.uid) return;
    setSubmitting(true);
    try {
      const yearMonth = format(new Date(), 'yyyyMM');
      const shortUid = currentUser.uid.substring(0, 6).toUpperCase();
      const challanNumber = `TOSMS-${yearMonth}-${shortUid}`;
      
      const newChallanRef = doc(collection(db, COLLECTIONS.CHALLANS));
      
      const challanData = {
        challanId: newChallanRef.id,
        studentId: currentUser.uid,
        studentName: currentUser.fullName,
        studentPhone: currentUser.phone || '',
        routeId: currentUser.routeId || '',
        routeName: routeName,
        month: currentMonth,
        amount: feeAmount,
        challanNumber: challanNumber,
        status: 'generated',
        generatedAt: Timestamp.now(),
      };

      await setDoc(newChallanRef, challanData);
      setSubmitting(false);
      
      navigation.navigate('ChallanView', { challanId: newChallanRef.id });
    } catch (error) {
      console.error('Error generating challan:', error);
      Alert.alert('Error', 'Failed to generate challan slip.');
      setSubmitting(false);
    }
  };

  const handleMobilePaymentSubmit = async () => {
    if (!transactionId.trim() || !mobileNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter both Transaction ID and your mobile number.');
      return;
    }
    if (!currentUser?.uid) return;
    
    setSubmitting(true);
    try {
      const newPaymentRef = doc(collection(db, COLLECTIONS.FEE_PAYMENTS));
      await setDoc(newPaymentRef, {
        paymentId: newPaymentRef.id,
        studentId: currentUser.uid,
        studentName: currentUser.fullName,
        routeId: currentUser.routeId || '',
        month: currentMonth,
        amount: feeAmount,
        paymentMethod: selectedMethod,
        paymentStatus: 'submitted',
        transactionId: transactionId,
        submittedAt: Timestamp.now(),
      });
      
      Alert.alert('Submitted!', 'Admin will verify within 24 hours.');
      navigation.navigate('StudentHome');
    } catch (error) {
      console.error('Error submitting payment proof:', error);
      Alert.alert('Error', 'Failed to submit payment details.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', 'Account number copied to clipboard.');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Success State
  if (paymentStatus?.paymentStatus === 'verified') {
    return (
      <View style={styles.stateContainer}>
        <Icon name="check-circle" size={64} color="#16A34A" />
        <Text style={styles.stateTitle}>Fee Paid!</Text>
        <Text style={styles.stateText}>Your fee for {currentMonthDisplay} is verified.</Text>
        <Button 
          mode="outlined" 
          style={{ marginTop: 24, borderRadius: 8, borderColor: COLORS.primary }}
          textColor={COLORS.primary}
          onPress={() => navigation.navigate('PaymentHistory')}
        >
          View Payment History
        </Button>
      </View>
    );
  }

  // Pending State
  if (paymentStatus?.paymentStatus === 'submitted') {
    return (
      <View style={styles.stateContainer}>
        <Icon name="clock-outline" size={64} color="#F59E0B" />
        <Text style={styles.stateTitle}>Payment Under Review</Text>
        <Text style={styles.stateText}>We will notify you once verified.</Text>
        <Button 
          mode="outlined" 
          style={{ marginTop: 24, borderRadius: 8, borderColor: COLORS.primary }}
          textColor={COLORS.primary}
          onPress={() => navigation.navigate('PaymentHistory')}
        >
          View Payment History
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Monthly Transport Fee</Text>
          <Text style={styles.headerSubtitle}>{currentMonthDisplay}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Icon name="account" size={20} color={COLORS.textSecondary} />
            <Text style={styles.summaryText}>{currentUser?.fullName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Icon name="map-marker-path" size={20} color={COLORS.textSecondary} />
            <Text style={styles.summaryText}>{routeName || 'No route assigned'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Icon name="cash" size={20} color={COLORS.primary} />
            <Text style={[styles.summaryText, { color: COLORS.primary, fontWeight: '700' }]}>PKR {feeAmount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Icon name="calendar-alert" size={20} color="#DC2626" />
            <Text style={[styles.summaryText, { color: '#DC2626' }]}>Due: {COMPANY_INFO.FEE_DUE_DATE}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Select Payment Method</Text>

        {/* Method Selection */}
        {[
          { id: 'bank', icon: 'bank', title: 'Bank Deposit', desc: 'Generate a challan slip' },
          { id: 'easypaisa', icon: 'cellphone', title: 'EasyPaisa', desc: 'Pay via EasyPaisa mobile account' },
          { id: 'jazzcash', icon: 'cellphone', title: 'JazzCash', desc: 'Pay via JazzCash mobile account' },
        ].map(method => (
          <TouchableOpacity 
            key={method.id}
            style={[
              styles.methodCard, 
              selectedMethod === method.id && styles.methodCardSelected
            ]}
            onPress={() => setSelectedMethod(method.id as any)}
          >
            <Icon name={method.icon} size={28} color={selectedMethod === method.id ? COLORS.primary : COLORS.textSecondary} />
            <View style={styles.methodTextContainer}>
              <Text style={styles.methodTitle}>{method.title}</Text>
              <Text style={styles.methodDesc}>{method.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Dynamic Actions */}
        {selectedMethod === 'bank' && (
          <View style={styles.actionSection}>
            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={handleGenerateChallan}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Generate Challan</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {(selectedMethod === 'easypaisa' || selectedMethod === 'jazzcash') && (
          <View style={styles.actionSection}>
            <View style={styles.instructionsCard}>
              <View style={styles.instructionHead}>
                <Icon name="information" size={20} color={COLORS.primary} />
                <Text style={styles.instructionTitle}>Send payment to:</Text>
              </View>
              <View style={styles.accountBox}>
                <Text style={styles.accountNumber}>
                  {selectedMethod === 'easypaisa' ? COMPANY_INFO.EASYPAISA_ACCOUNT : COMPANY_INFO.JAZZCASH_ACCOUNT}
                </Text>
                <TouchableOpacity onPress={() => copyToClipboard(selectedMethod === 'easypaisa' ? COMPANY_INFO.EASYPAISA_ACCOUNT : COMPANY_INFO.JAZZCASH_ACCOUNT)}>
                  <Icon name="content-copy" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.amountToSend}>Amount to send: PKR {feeAmount}</Text>
              
              <TextInput
                label="Transaction ID (from SMS)"
                value={transactionId}
                onChangeText={setTransactionId}
                mode="outlined"
                style={styles.input}
                outlineColor="#E5E7EB"
                activeOutlineColor={COLORS.primary}
              />
              <TextInput
                label={`Your ${selectedMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'} Number`}
                value={mobileNumber}
                onChangeText={setMobileNumber}
                mode="outlined"
                style={styles.input}
                keyboardType="phone-pad"
                outlineColor="#E5E7EB"
                activeOutlineColor={COLORS.primary}
              />
            </View>

            <TouchableOpacity 
              style={[styles.primaryBtn, { marginTop: 16 }]} 
              onPress={handleMobilePaymentSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Submit Payment Proof</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  stateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', padding: 24 },
  stateTitle: { fontSize: 24, fontWeight: '700', marginTop: 16, color: COLORS.text },
  stateText: { fontSize: 15, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' },
  header: { 
    backgroundColor: COLORS.primary, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 50, 
    paddingBottom: 20,
    paddingHorizontal: 20 
  },
  backBtn: { marginRight: 16 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  headerSubtitle: { fontSize: 14, color: '#FFF', opacity: 0.8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  summaryCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    padding: 16, 
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 20 
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6, gap: 10 },
  summaryText: { fontSize: 15, color: COLORS.text },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  methodCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 10, 
    flexDirection: 'row', 
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB'
  },
  methodCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F4FF'
  },
  methodTextContainer: { marginLeft: 16, flex: 1 },
  methodTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  methodDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  actionSection: { marginTop: 10 },
  primaryBtn: { 
    backgroundColor: COLORS.primary, 
    borderRadius: 10, 
    padding: 14, 
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%' 
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  instructionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  instructionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  instructionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  accountBox: { 
    backgroundColor: '#F3F4F6', 
    borderRadius: 8, 
    padding: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12
  },
  accountNumber: { fontSize: 18, fontWeight: '700', color: COLORS.primary, letterSpacing: 1 },
  amountToSend: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  input: { backgroundColor: '#FFF', marginBottom: 12 }
});

export default FeePaymentScreen;
