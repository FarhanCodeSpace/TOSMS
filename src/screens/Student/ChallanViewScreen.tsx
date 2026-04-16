import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '@hooks/useAuth';
import { COLORS } from '@constants/theme';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { COMPANY_INFO } from '@constants/companyInfo';
import { doc, getDoc } from 'firebase/firestore';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { StudentHomeStackParamList } from '@navigation/types';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import LoadingSpinner from '@components/common/LoadingSpinner';
import { amountInWords, formatMonth } from '@utils/formatters';

type ChallanViewScreenProps = {
  navigation: StackNavigationProp<StudentHomeStackParamList, 'ChallanView'>;
  route: RouteProp<StudentHomeStackParamList, 'ChallanView'>;
};

const ChallanViewScreen: React.FC<ChallanViewScreenProps> = ({ navigation, route }) => {
  const { challanId } = route.params;
  const [loading, setLoading] = useState(true);
  const [challan, setChallan] = useState<any>(null);
  const viewShotRef = useRef<ViewShot>(null);

  useEffect(() => {
    fetchChallan();
  }, [challanId]);

  const fetchChallan = async () => {
    try {
      const docRef = doc(db, COLLECTIONS.CHALLANS, challanId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setChallan({ id: docSnap.id, ...docSnap.data() });
      } else {
        Alert.alert('Error', 'Challan not found');
        navigation.goBack();
      }
    } catch {
      Alert.alert('Error', 'Failed to fetch challan details.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      if (viewShotRef.current) {
        const uri = await captureRef(viewShotRef, {
          format: 'png',
          quality: 0.9,
        });

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to share challan slip.');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!challan) return null;

  const currentMonthDisplay = formatMonth(challan.month);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>View Challan</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <ViewShot ref={viewShotRef} style={styles.viewShotContainer} options={{ format: 'png', quality: 0.9 }}>
          {/* Top Bar */}
          <View style={styles.challanTopBar}>
            <View>
              <Text style={styles.tosmsLogoText}>TOSMS</Text>
              <Text style={styles.transportText}>TRANSPORT FEE CHALLAN</Text>
            </View>
            <View>
              <Text style={styles.challanNoTop}>No. {challan.challanNumber}</Text>
            </View>
          </View>

          {/* Bank Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionHeading}>BANK DETAILS</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Bank Name</Text>
              <Text style={styles.value}>{COMPANY_INFO.BANK_NAME}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Account Title</Text>
              <Text style={styles.value}>{COMPANY_INFO.BANK_ACCOUNT_TITLE}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Account Number</Text>
              <Text style={styles.value}>{COMPANY_INFO.BANK_ACCOUNT_NUMBER}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Branch Code</Text>
              <Text style={styles.value}>{COMPANY_INFO.BANK_BRANCH_CODE}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>IBAN</Text>
              <Text style={styles.value}>{COMPANY_INFO.BANK_IBAN}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.dashedDivider} />

          {/* Student Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionHeading}>STUDENT DETAILS</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Challan No</Text>
              <Text style={[styles.value, { color: COLORS.primary, fontWeight: '700' }]}>{challan.challanNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Student Name</Text>
              <Text style={styles.value}>{challan.studentName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Route</Text>
              <Text style={styles.value}>{challan.routeName || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Month</Text>
              <Text style={styles.value}>{currentMonthDisplay}</Text>
            </View>
            <View style={[styles.row, { marginTop: 12, borderTopWidth: 1, borderColor: '#E5E7EB', paddingTop: 12 }]}>
              <Text style={[styles.label, { fontSize: 14, fontWeight: '600' }]}>Amount</Text>
              <Text style={[styles.value, { fontSize: 18, color: COLORS.accent, fontWeight: '800' }]}>
                PKR {challan.amount}
              </Text>
            </View>
            <View style={[styles.row, { justifyContent: 'flex-end', marginTop: 4 }]}>
              <Text style={styles.amountInWordsText}>{amountInWords(challan.amount)}</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footerSection}>
            <View style={styles.thinLine} />
            <Text style={styles.footerText}>Please deposit at any {COMPANY_INFO.BANK_NAME} branch before {COMPANY_INFO.FEE_DUE_DATE}</Text>
            <Text style={styles.footerText}>Keep bank-stamped receipt as proof</Text>
          </View>
        </ViewShot>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Button 
            mode="outlined" 
            icon="share-variant" 
            onPress={handleShare}
            textColor={COLORS.primary}
            style={styles.shareBtn}
          >
            Share Challan
          </Button>
          
          <TouchableOpacity 
            style={styles.depositBtn} 
            onPress={() => navigation.navigate('ChallanDeposit' as any, { 
              challanId: challan.id,
              challanNumber: challan.challanNumber
            })}
          >
            <Icon name="bank-transfer" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.depositBtnText}>I Have Deposited</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  viewShotContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 24,
  },
  challanTopBar: {
    backgroundColor: COLORS.primary,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  tosmsLogoText: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  transportText: { fontSize: 12, color: '#FFF', opacity: 0.8, marginTop: 4 },
  challanNoTop: { fontSize: 11, color: '#FFF', fontWeight: '600' },
  detailsSection: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    margin: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  sectionHeading: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
  label: { fontSize: 12, color: COLORS.textSecondary },
  value: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  amountInWordsText: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 2 },
  dashedDivider: {
    height: 1,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed'
  },
  footerSection: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#FFF'
  },
  thinLine: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 12 },
  footerText: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 4 },
  actionSection: { gap: 12 },
  shareBtn: { borderColor: COLORS.primary, borderRadius: 10, paddingVertical: 4 },
  depositBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  depositBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' }
});

export default ChallanViewScreen;
