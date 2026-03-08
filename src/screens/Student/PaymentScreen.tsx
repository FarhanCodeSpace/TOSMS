import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { doc, updateDoc } from 'firebase/firestore';
import { COLORS, SPACING, FONTS } from '@constants/theme';
import { StackScreenProps } from '@react-navigation/stack';
import { StudentHomeStackParamList } from '@navigation/types';

type PaymentScreenProps = StackScreenProps<StudentHomeStackParamList, 'Payment'>;

type PaymentMethod = 'card' | 'cash' | null;

export const PaymentScreen: React.FC<PaymentScreenProps> = ({ route, navigation }) => {
  const { bookingId, fareAmount, routeName, seatNumber, driverName, rideId } = route.params;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCashPayment = async () => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.BOOKINGS, bookingId), {
        paymentStatus: 'cash_pending',
      });

      navigation.navigate('BookingConfirm', {
        bookingId,
        fareAmount,
        routeName,
        seatNumber,
        driverName,
        rideId,
      });
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Failed to confirm payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    // Stripe card payment — requires backend Cloud Function and StripeProvider setup
    Alert.alert(
      'Card Payment',
      'Card payment requires Stripe setup.\n\nTo enable:\n1. Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env\n2. Deploy the Firebase Cloud Function createPaymentIntent\n3. Wrap App.tsx with <StripeProvider>\n\nFor now, using "Pay at Pickup" is recommended.',
      [{ text: 'OK' }]
    );
  };

  const handleConfirm = () => {
    if (!paymentMethod) {
      Alert.alert('Select Payment', 'Please select a payment method first.');
      return;
    }
    if (paymentMethod === 'cash') {
      handleCashPayment();
    } else {
      handleCardPayment();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Booking Summary */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text style={styles.summaryTitle}>Booking Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Route</Text>
            <Text style={styles.summaryValue}>{routeName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Driver</Text>
            <Text style={styles.summaryValue}>{driverName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Seat</Text>
            <Text style={styles.summaryValue}>Seat {seatNumber}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>PKR {fareAmount?.toLocaleString()}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Payment Method Selection */}
      <Text style={styles.sectionTitle}>Select Payment Method</Text>

      <TouchableOpacity
        style={[styles.methodCard, paymentMethod === 'card' && styles.methodCardSelected]}
        onPress={() => setPaymentMethod('card')}
      >
        <Text style={styles.methodEmoji}>💳</Text>
        <View style={styles.methodInfo}>
          <Text style={styles.methodTitle}>Pay by Card</Text>
          <Text style={styles.methodSubtitle}>Stripe secure payment</Text>
        </View>
        {paymentMethod === 'card' && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.methodCard, paymentMethod === 'cash' && styles.methodCardSelected]}
        onPress={() => setPaymentMethod('cash')}
      >
        <Text style={styles.methodEmoji}>💵</Text>
        <View style={styles.methodInfo}>
          <Text style={styles.methodTitle}>Pay at Pickup</Text>
          <Text style={styles.methodSubtitle}>Pay cash to driver when boarding</Text>
        </View>
        {paymentMethod === 'cash' && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      <Button
        mode="contained"
        buttonColor={COLORS.accent}
        textColor="white"
        style={styles.confirmBtn}
        disabled={!paymentMethod || isProcessing}
        loading={isProcessing}
        onPress={handleConfirm}
      >
        {paymentMethod === 'card'
          ? `Pay PKR ${fareAmount?.toLocaleString()}`
          : 'Confirm — Pay at Pickup'}
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  summaryCard: {
    backgroundColor: COLORS.surface,
    elevation: 3,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  summaryTitle: {
    fontSize: FONTS.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  summaryLabel: { color: COLORS.textSecondary, fontSize: FONTS.md },
  summaryValue: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '500' },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  totalLabel: { fontSize: FONTS.lg, fontWeight: 'bold', color: COLORS.text },
  totalAmount: { fontSize: FONTS.xl, fontWeight: 'bold', color: COLORS.accent },
  sectionTitle: {
    fontSize: FONTS.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
  },
  methodCardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: '#FFF8EE',
  },
  methodEmoji: { fontSize: 32, marginRight: SPACING.md },
  methodInfo: { flex: 1 },
  methodTitle: { fontSize: FONTS.lg, fontWeight: 'bold', color: COLORS.text },
  methodSubtitle: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 2 },
  checkmark: { fontSize: 22, color: COLORS.accent, fontWeight: 'bold' },
  confirmBtn: { borderRadius: 8, paddingVertical: 4, marginTop: SPACING.sm },
});

export default PaymentScreen;
