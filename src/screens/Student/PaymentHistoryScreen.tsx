import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Text, Portal, Button } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '@hooks/useAuth';
import { COLORS } from '@constants/theme';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { format } from 'date-fns';
import { StackNavigationProp } from '@react-navigation/stack';
import { StudentHomeStackParamList } from '@navigation/types';

type PaymentHistoryScreenProps = {
  navigation: StackNavigationProp<StudentHomeStackParamList, 'PaymentHistory'>;
};

const formatPKR = (amount: number) => {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount);
};

const PaymentHistoryScreen: React.FC<PaymentHistoryScreenProps> = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const paymentsQuery = query(
      collection(db, COLLECTIONS.FEE_PAYMENTS),
      where('studentId', '==', currentUser.uid),
      orderBy('submittedAt', 'desc')
    );

    const auth = getAuth();
    const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      if (!auth.currentUser) return;
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayments(p);
      setLoading(false);
    }, (error: any) => {
      if (error.code === 'permission-denied') return;
      console.error('Error fetching payments:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const verifiedPaymentsCount = payments.filter(p => p.paymentStatus === 'verified').length;
  const totalPaid = payments
    .filter(p => p.paymentStatus === 'verified')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const openDetails = (payment: any) => {
    if (payment.paymentStatus === 'verified') {
      setSelectedPayment(payment);
      setModalVisible(true);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'verified') return '#16A34A';
    if (status === 'submitted') return '#F59E0B';
    return '#DC2626';
  };

  const getStatusText = (status: string) => {
    if (status === 'verified') return 'Verified ✓';
    if (status === 'submitted') return 'Under Review';
    return 'Pending';
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Icon name="check-circle" size={24} color="#16A34A" />
            <Text style={styles.statValue}>{verifiedPaymentsCount}</Text>
            <Text style={styles.statLabel}>Payments Made</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="cash-multiple" size={24} color={COLORS.primary} />
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{formatPKR(totalPaid).replace('PKR\xa0', '')}</Text>
            <Text style={styles.statLabel}>Total Paid</Text>
          </View>
        </View>

        {payments.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="receipt" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Payment History</Text>
            <Text style={styles.emptyText}>Your payment records will appear here.</Text>
          </View>
        ) : (
          payments.map(payment => {
            const isBank = payment.paymentMethod === 'bank_challan';
            const iconName = isBank ? 'bank' : 'cellphone';
            const iconColor = isBank ? '#3B82F6' : '#8B5CF6';
            const methodName = isBank ? 'Bank Challan' : (payment.paymentMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash');
            const monthDisplay = format(new Date(payment.month + '-01'), 'MMMM yyyy');

            return (
              <TouchableOpacity
                key={payment.id}
                style={styles.paymentCard}
                onPress={() => openDetails(payment)}
                activeOpacity={payment.paymentStatus === 'verified' ? 0.7 : 1}
              >
                <View style={styles.paymentLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: iconColor + '20' }]}>
                    <Icon name={iconName} size={24} color={iconColor} />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.monthText}>{monthDisplay}</Text>
                    <Text style={styles.methodText}>{methodName}</Text>
                  </View>
                </View>
                <View style={styles.paymentRight}>
                  <Text style={styles.amountText}>PKR {payment.amount}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payment.paymentStatus) + '15' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(payment.paymentStatus) }]}>
                      {getStatusText(payment.paymentStatus)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Details Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Payment Details</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Icon name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              
              {selectedPayment && (
                <View style={styles.modalBody}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Month</Text>
                    <Text style={styles.detailValue}>{format(new Date(selectedPayment.month + '-01'), 'MMMM yyyy')}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Method</Text>
                    <Text style={styles.detailValue}>
                      {selectedPayment.paymentMethod === 'bank_challan' ? 'Bank Challan' : 
                       (selectedPayment.paymentMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash')}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={[styles.detailValue, { color: COLORS.primary }]}>PKR {selectedPayment.amount}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {selectedPayment.paymentMethod === 'bank_challan' ? 'Challan No' : 'Transaction ID'}
                    </Text>
                    <Text style={styles.detailValue}>
                      {selectedPayment.paymentMethod === 'bank_challan' ? selectedPayment.challanNumber : selectedPayment.transactionId}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Verified On</Text>
                    <Text style={styles.detailValue}>
                      {selectedPayment.verifiedAt ? format(selectedPayment.verifiedAt.toDate(), 'PPP p') : 'Pending'}
                    </Text>
                  </View>
                  
                  <Button mode="contained" onPress={() => setModalVisible(false)} style={styles.modalBtn}>
                    Close
                  </Button>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </Portal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    backgroundColor: COLORS.primary, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 50, 
    paddingBottom: 20,
    paddingHorizontal: 20 
  },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  statValue: { fontSize: 20, fontWeight: '700', color: '#16A34A', marginTop: 8 },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
  paymentCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  paymentInfo: { justifyContent: 'center' },
  monthText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  methodText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  paymentRight: { alignItems: 'flex-end', justifyContent: 'center' },
  amountText: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden' },
  modalHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalBody: { padding: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  detailLabel: { fontSize: 14, color: COLORS.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: COLORS.text, textAlign: 'right', flex: 1, marginLeft: 20 },
  modalBtn: { marginTop: 24, borderRadius: 8, backgroundColor: COLORS.primary }
});

export default PaymentHistoryScreen;
