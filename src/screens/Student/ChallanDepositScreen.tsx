import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '@hooks/useAuth';
import { COLORS } from '@constants/theme';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { doc, getDoc, setDoc, updateDoc, Timestamp, collection } from 'firebase/firestore';
import { uploadFileToStorage } from '@utils/imageUtils';
import { format } from 'date-fns';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, CommonActions } from '@react-navigation/native';
import { StudentHomeStackParamList } from '@navigation/types';
import * as ImagePicker from 'expo-image-picker';

type ChallanDepositScreenProps = {
  navigation: StackNavigationProp<StudentHomeStackParamList, 'ChallanDeposit'>;
  route: RouteProp<StudentHomeStackParamList, 'ChallanDeposit'>;
};

const ChallanDepositScreen: React.FC<ChallanDepositScreenProps> = ({ navigation, route }) => {
  const { challanId, challanNumber } = route.params;
  const { currentUser } = useAuth();
  
  const [referenceNumber, setReferenceNumber] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentMonth = format(new Date(), 'yyyy-MM');

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image from library');
    }
  };

  const uploadImage = async (uri: string): Promise<string> => {
    if (!currentUser?.uid) throw new Error("No user ID");
    
    // Use ImageKit instead of Firebase Storage
    // Folder: /receipts/{studentId}, FileName: {month}-receipt
    const storagePath = `receipts/${currentUser.uid}/${currentMonth}-receipt`;
    return await uploadFileToStorage(uri, storagePath);
  };

  const handleSubmit = async () => {
    if (!referenceNumber.trim() || !imageUri) return;
    if (!currentUser?.uid) return;

    setSubmitting(true);
    try {
      // Fetch challan details first to get the right amount and route info
      const challanRef = doc(db, COLLECTIONS.CHALLANS, challanId);
      const challanSnap = await getDoc(challanRef);
      
      if (!challanSnap.exists()) {
        throw new Error("Challan not found");
      }
      const challanData = challanSnap.data();

      // Upload image
      const receiptUrl = await uploadImage(imageUri);
      
      // Create Fee Payment record
      const newPaymentRef = doc(collection(db, COLLECTIONS.FEE_PAYMENTS));
      await setDoc(newPaymentRef, {
        paymentId: newPaymentRef.id,
        studentId: currentUser.uid,
        studentName: currentUser.fullName,
        routeId: challanData.routeId || currentUser.routeId || '',
        month: challanData.month || currentMonth,
        amount: challanData.amount,
        paymentMethod: 'bank_challan',
        paymentStatus: 'submitted',
        challanNumber: challanNumber,
        transactionId: referenceNumber,
        receiptImageUrl: receiptUrl,
        submittedAt: Timestamp.now(),
      });

      // Update Challan Status
      await updateDoc(challanRef, {
        status: 'deposited',
        receiptImageUrl: receiptUrl
      });

      Alert.alert('Proof submitted!', 'Admin will verify your payment within 24 hours.');
      
      // Reset navigation stack to Home
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'StudentHome' }],
        })
      );
    } catch {
      Alert.alert('Error', 'Failed to submit deposit proof. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = referenceNumber.trim().length > 0 && imageUri !== null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Deposit Proof</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.scroll}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Icon name="information-outline" size={20} color={COLORS.primary} style={{ marginTop: 2 }} />
          <Text style={styles.instructionsText}>
            Enter your bank deposit reference number and upload a photo of the stamped receipt.
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Deposit Reference Number</Text>
          <TextInput
            style={styles.input}
            value={referenceNumber}
            onChangeText={setReferenceNumber}
            placeholder="e.g. 987654321"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Receipt Photo</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.receiptImage} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Icon name="camera-plus" size={48} color="#9CA3AF" />
                <Text style={styles.uploadText}>Tap to upload receipt photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Proof</Text>
          )}
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
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
  scrollContent: { padding: 16, paddingBottom: 10 },
  instructionsCard: {
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 10
  },
  instructionsText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  formGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginLeft: 2 },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: COLORS.text
  },
  uploadBox: {
    height: 200,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  uploadPlaceholder: { alignItems: 'center' },
  uploadText: { fontSize: 13, color: '#9CA3AF', marginTop: 12 },
  receiptImage: { width: '100%', height: '100%', borderRadius: 10 },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10
  },
  submitBtnDisabled: { backgroundColor: '#E5E7EB' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' }
});

export default ChallanDepositScreen;
