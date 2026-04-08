import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Keyboard,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/firebaseCollections';
import { doc, updateDoc } from 'firebase/firestore';
import { uploadFileToStorage } from '@utils/imageUtils';
import { useAuth } from '@hooks/useAuth';
import { COLORS, SPACING, FONTS } from '@constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { StudentProfileStackParamList } from '@navigation/types';

type EditProfileScreenProps = StackScreenProps<StudentProfileStackParamList, 'EditProfile'>;

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  const first = parts[0]?.[0] || '';
  const last = parts[parts.length - 1]?.[0] || '';
  return (first + last).toUpperCase();
};

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const { currentUser, updateUser } = useAuth();

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Allow access to your photos to update your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setNewImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!currentUser?.uid) return;
    setIsSaving(true);
    try {
      let profileImageUrl = currentUser.profileImageUrl;

      if (newImageUri) {
        const storagePath = `profileImages/${currentUser.uid}`;
        profileImageUrl = await uploadFileToStorage(newImageUri, storagePath);
      }

      const updatedData = { fullName, phone, profileImageUrl };
      await updateDoc(doc(db, COLLECTIONS.USERS, currentUser.uid), updatedData);
      updateUser(updatedData);
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const avatarSource = newImageUri || currentUser?.profileImageUrl;

  return (
    <Pressable 
      style={styles.container} 
      onPress={Keyboard.dismiss}
      accessible={false}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
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

        {/* Avatar Picker */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickImage}>
            {avatarSource ? (
              <Image source={{ uri: avatarSource }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>
                  {getInitials(currentUser?.fullName || '')}
                </Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Tap to change photo</Text>
        </View>

        {/* Form Fields */}
        <TextInput
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          mode="outlined"
          style={styles.input}
          outlineColor={COLORS.primary}
          activeOutlineColor={COLORS.primary}
        />

        <TextInput
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          mode="outlined"
          style={styles.input}
          keyboardType="phone-pad"
          outlineColor={COLORS.primary}
          activeOutlineColor={COLORS.primary}
        />

        <TextInput
          label="Email"
          value={currentUser?.email || ''}
          mode="outlined"
          style={styles.input}
          disabled
          outlineColor={COLORS.primary}
        />

        <Button
          mode="contained"
          buttonColor={COLORS.primary}
          style={styles.saveBtn}
          loading={isSaving}
          disabled={isSaving}
          onPress={handleSave}
        >
          Save Changes
        </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingTop: 60, paddingBottom: 10 },
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
  avatarSection: { alignItems: 'center', marginBottom: SPACING.xl, marginTop: SPACING.xs },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadgeText: { fontSize: 14 },
  changePhotoText: { color: COLORS.textSecondary, fontSize: FONTS.sm, marginTop: SPACING.sm },
  input: { marginBottom: SPACING.md, backgroundColor: COLORS.surface },
  saveBtn: { borderRadius: 8, marginTop: SPACING.sm },
});

export default EditProfileScreen;
