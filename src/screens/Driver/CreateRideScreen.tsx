import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { TextInput, Button, Text, Card, IconButton, HelperText, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, MarkerDragStartEndEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuth } from '@hooks/useAuth';
import { COLORS, SPACING } from '@constants/theme';
import { StackNavigationProp } from '@react-navigation/stack';
import { DriverHomeStackParamList } from '@navigation/types';

type CreateRideScreenProps = {
  navigation: StackNavigationProp<DriverHomeStackParamList, 'CreateRide'>;
};

const CreateRideScreen: React.FC<CreateRideScreenProps> = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Route Info
  const [routeName, setRouteName] = useState('');
  const [startLoc, setStartLoc] = useState({ name: '', latitude: 33.6844, longitude: 73.0479 });
  const [endLoc, setEndLoc] = useState({ name: '', latitude: 33.7294, longitude: 73.0931 });
  const [stops, setStops] = useState<{ stopName: string; order: number }[]>([]);
  const [newStop, setNewStop] = useState('');

  // Step 2: Schedule and Seats
  const [departureDate, setDepartureDate] = useState(new Date());
  const [departureTime, setDepartureTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [totalSeats, setTotalSeats] = useState(currentUser?.vehicleCapacity?.toString() || '15');
  const [farePerSeat, setFarePerSeat] = useState('');

  const handleReverseGeocode = async (lat: number, lng: number, type: 'start' | 'end') => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to find addresses.');
        return;
      }
      const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (result.length > 0) {
        const address = `${result[0].name || ''}, ${result[0].city || ''}`;
        if (type === 'start') setStartLoc(prev => ({ ...prev, name: address, latitude: lat, longitude: lng }));
        else setEndLoc(prev => ({ ...prev, name: address, latitude: lat, longitude: lng }));
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
  };

  const addStop = () => {
    if (newStop.trim()) {
      setStops([...stops, { stopName: newStop.trim(), order: stops.length + 1 }]);
      setNewStop('');
    }
  };

  const deleteStop = (index: number) => {
    const updated = stops.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }));
    setStops(updated);
  };

  const validateStep1 = () => {
    if (!routeName || !startLoc.name || !endLoc.name) {
      Alert.alert('Error', 'Please fill in all route details');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!totalSeats || !farePerSeat) {
      Alert.alert('Error', 'Please enter seat capacity and fare');
      return false;
    }
    return true;
  };

  const handlePostRide = async () => {
    setIsLoading(true);
    try {
      const combinedDeparture = new Date(departureDate);
      combinedDeparture.setHours(departureTime.getHours(), departureTime.getMinutes(), 0, 0);

      const seatMap: Record<number, any> = {};
      const total = parseInt(totalSeats);
      for (let i = 1; i <= total; i++) {
        seatMap[i] = { studentId: null, studentName: null, status: 'available' };
      }

      const rideData = {
        driverId: currentUser?.uid,
        driverName: currentUser?.fullName,
        driverPhone: currentUser?.phone,
        driverRating: currentUser?.rating || 0,
        vehicleType: currentUser?.vehicleType,
        vehiclePlate: currentUser?.vehiclePlate,
        routeName,
        startLocation: startLoc,
        endLocation: endLoc,
        stops,
        departureTime: Timestamp.fromDate(combinedDeparture),
        totalSeats: total,
        availableSeats: total,
        farePerSeat: parseInt(farePerSeat),
        passengerIds: [],
        seatMap,
        status: 'scheduled',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, COLLECTIONS.RIDES), rideData);
      Alert.alert('Success', 'Ride posted successfully!');
      navigation.navigate('DriverHome');
    } catch (error) {
      console.error('Error posting ride:', error);
      Alert.alert('Error', 'Failed to post ride. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <View>
      <TextInput label="Route Name (e.g., Rawalpindi to Islamabad)" value={routeName} onChangeText={setRouteName} mode="outlined" style={styles.input} />
      
      <Text style={styles.label}>Start Location</Text>
      <TextInput placeholder="Start Location Name" value={startLoc.name} onChangeText={(t) => setStartLoc(p => ({ ...p, name: t }))} mode="outlined" style={styles.input} />
      <MapView 
        style={styles.map} 
        initialRegion={{ ...startLoc, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        onPress={(e) => handleReverseGeocode(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude, 'start')}
      >
        <Marker 
          coordinate={startLoc} 
          draggable 
          onDragEnd={(e) => handleReverseGeocode(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude, 'start')} 
        />
      </MapView>

      <Text style={styles.label}>End Location</Text>
      <TextInput placeholder="End Location Name" value={endLoc.name} onChangeText={(t) => setEndLoc(p => ({ ...p, name: t }))} mode="outlined" style={styles.input} />
      <MapView 
        style={styles.map} 
        initialRegion={{ ...endLoc, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        onPress={(e) => handleReverseGeocode(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude, 'end')}
      >
        <Marker 
          coordinate={endLoc} 
          draggable 
          onDragEnd={(e) => handleReverseGeocode(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude, 'end')} 
        />
      </MapView>

      <Text style={styles.label}>Route Stops</Text>
      <View style={styles.stopInputRow}>
        <TextInput label="Add Stop" value={newStop} onChangeText={setNewStop} mode="outlined" style={[styles.input, { flex: 1, marginBottom: 0 }]} />
        <IconButton icon="plus" mode="contained" containerColor={COLORS.primary} iconColor="white" onPress={addStop} style={{ marginLeft: 8 }} />
      </View>
      {stops.map((stop, index) => (
        <View key={index} style={styles.stopItem}>
          <Text>{stop.order}. {stop.stopName}</Text>
          <IconButton icon="close" size={20} onPress={() => deleteStop(index)} />
        </View>
      ))}

      <Button mode="contained" onPress={() => validateStep1() && setStep(2)} style={styles.nextBtn} buttonColor={COLORS.primary}>Next</Button>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.label}>Departure Schedule</Text>
      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.pickerTrigger}>
        <Text style={styles.pickerText}>Date: {format(departureDate, 'PPP')}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker value={departureDate} mode="date" onChange={(e, d) => { setShowDatePicker(false); if(d) setDepartureDate(d); }} />
      )}

      <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.pickerTrigger}>
        <Text style={styles.pickerText}>Time: {format(departureTime, 'p')}</Text>
      </TouchableOpacity>
      {showTimePicker && (
        <DateTimePicker value={departureTime} mode="time" onChange={(e, d) => { setShowTimePicker(false); if(d) setDepartureTime(d); }} />
      )}

      <TextInput label="Total Seats" value={totalSeats} onChangeText={setTotalSeats} mode="outlined" keyboardType="numeric" style={styles.input} />
      <TextInput label="Fare Per Seat (PKR)" value={farePerSeat} onChangeText={setFarePerSeat} mode="outlined" keyboardType="numeric" style={styles.input} />

      <View style={styles.btnRow}>
        <Button mode="outlined" onPress={() => setStep(1)} style={styles.flexBtn} textColor={COLORS.primary}>Back</Button>
        <Button mode="contained" onPress={() => validateStep2() && setStep(3)} style={styles.flexBtn} buttonColor={COLORS.primary}>Next</Button>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Card style={styles.reviewCard}>
        <Card.Title title="Ride Summary" subtitle={routeName} />
        <Card.Content>
          <Text style={styles.reviewText}>📍 Start: {startLoc.name}</Text>
          <Text style={styles.reviewText}>🏁 End: {endLoc.name}</Text>
          <Text style={styles.reviewText}>📅 Date: {format(departureDate, 'PPP')}</Text>
          <Text style={styles.reviewText}>⏰ Time: {format(departureTime, 'p')}</Text>
          <Text style={styles.reviewText}>💺 Seats: {totalSeats}</Text>
          <Text style={styles.reviewText}>💰 Fare: PKR {farePerSeat}</Text>
          <Text style={styles.reviewText}>🛑 Stops: {stops.length > 0 ? stops.map(s => s.stopName).join(', ') : 'Direct'}</Text>
        </Card.Content>
      </Card>

      <View style={styles.btnRow}>
        <Button mode="outlined" onPress={() => setStep(2)} style={styles.flexBtn} textColor={COLORS.primary}>Edit</Button>
        <Button mode="contained" onPress={handlePostRide} loading={isLoading} disabled={isLoading} style={styles.flexBtn} buttonColor={COLORS.primary}>Post Ride</Button>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: COLORS.background }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      {/* ── Floating Back Button ── */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.text} />
      </TouchableOpacity>

      <View style={styles.stepper}>
        <View style={styles.stepIndicator}>
          {[1, 2, 3].map(s => (
            <View key={s} style={[styles.stepDot, step >= s ? styles.stepActive : styles.stepInactive]} />
          ))}
        </View>
        <Text style={styles.stepTitle}>Step {step} of 3</Text>
      </View>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { 
    padding: SPACING.md, 
    paddingTop: 60, 
    paddingBottom: 10,
    backgroundColor: COLORS.background 
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
  stepper: { alignItems: 'center', marginBottom: SPACING.lg },
  stepIndicator: { flexDirection: 'row', marginBottom: 8 },
  stepDot: { width: 40, height: 4, borderRadius: 2, marginHorizontal: 4 },
  stepActive: { backgroundColor: COLORS.primary },
  stepInactive: { backgroundColor: '#E0E0E0' },
  stepTitle: { fontWeight: 'bold', color: COLORS.primary },
  input: { marginBottom: SPACING.md, backgroundColor: 'white' },
  label: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 8, marginTop: 8 },
  map: { height: 200, marginBottom: SPACING.md, borderRadius: 8 },
  stopInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  stopItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0F0F0', paddingLeft: 12, borderRadius: 4, marginBottom: 4 },
  nextBtn: { marginTop: SPACING.md, paddingVertical: 4 },
  pickerTrigger: { padding: 16, backgroundColor: 'white', borderRadius: 4, borderWidth: 1, borderColor: '#757575', marginBottom: SPACING.md },
  pickerText: { fontSize: 16, color: COLORS.text },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.lg },
  flexBtn: { flex: 0.48, paddingVertical: 4 },
  reviewCard: { backgroundColor: 'white', elevation: 2 },
  reviewText: { fontSize: 15, marginBottom: 8, color: COLORS.text },
});

export default CreateRideScreen;
