import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '@constants/theme';
import { useNavigation } from '@react-navigation/native';

const PlaceholderScreen: React.FC<{ title: string; icon: string }> = ({ title, icon }) => {
  const navigation = useNavigation();
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.text} />
      </TouchableOpacity>
      
      <View style={styles.content}>
        <Text style={styles.iconEm}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>Coming soon...</Text>
      </View>
    </View>
  );
};

export const FeePaymentScreen = () => <PlaceholderScreen icon="💳" title="Fee Payment" />;
export const ChallanViewScreen = () => <PlaceholderScreen icon="🧾" title="View Challan" />;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background,
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconEm: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: FONTS.xxl, fontWeight: 'bold', color: COLORS.primary, marginBottom: 8 },
  sub: { fontSize: FONTS.md, color: COLORS.textSecondary },
});
