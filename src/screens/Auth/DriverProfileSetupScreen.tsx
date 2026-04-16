import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import {
  TextInput,
  Button,
  Text,
  SegmentedButtons,
  HelperText,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@config/firebase";
import { COLLECTIONS } from "@config/firebaseCollections";
import { useAuth } from "@hooks/useAuth";
import { uploadFileToStorage } from "@utils/imageUtils";
import { COLORS, SPACING } from "@constants/theme";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "@navigation/types";
import { handleFirebaseError } from "@utils/errorHandler";

type DriverProfileSetupScreenProps = {
  navigation: StackNavigationProp<
    AuthStackParamList,
    "DriverProfileSetup" | any
  >;
};

const DriverProfileSetupScreen: React.FC<DriverProfileSetupScreenProps> = ({
  navigation,
}) => {
  const { currentUser, updateUser } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [cnic, setCnic] = useState("");
  const [vehicleType, setVehicleType] = useState("van");
  const [plateNumber, setPlateNumber] = useState("");
  const [capacity, setCapacity] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need camera roll permissions to make this work!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const validateCnic = (text: string) => {
    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    return cnicRegex.test(text);
  };

  const handleCnicChange = (text: string) => {
    // Basic auto-formatter for CNIC
    let formatted = text.replace(/[^\d]/g, "");
    if (formatted.length > 5)
      formatted = formatted.slice(0, 5) + "-" + formatted.slice(5);
    if (formatted.length > 13)
      formatted = formatted.slice(0, 13) + "-" + formatted.slice(13);
    setCnic(formatted.slice(0, 15));
  };

  const handleSubmit = async () => {
    if (!profileImage) {
      setError("Please select a profile photo");
      return;
    }
    if (!validateCnic(cnic)) {
      setError("Invalid CNIC format (XXXXX-XXXXXXX-X)");
      return;
    }
    if (!plateNumber || !capacity) {
      setError("All fields are required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let profileImageUrl = null;
      if (profileImage) {
        const storagePath = `profileImages/${currentUser?.uid}`;
        profileImageUrl = await uploadFileToStorage(profileImage, storagePath);
      }
      const driverData = {
        profileImageUrl,
        cnic,
        vehicleType,
        vehiclePlate: plateNumber,
        vehicleCapacity: parseInt(capacity),
        profileComplete: true,
        // Auto-approve for development/testing purposes
        approved: true,
      };

      if (currentUser?.uid) {
        await updateDoc(
          doc(db, COLLECTIONS.USERS, currentUser.uid),
          driverData,
        );
        updateUser(driverData);
        navigation.navigate("DriverPending");
      }
    } catch (err: any) {
      setError(handleFirebaseError(err.code) || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

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
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>
        Fill in your details to start as a driver
      </Text>

      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.profileImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.form}>
        <TextInput
          label="CNIC (XXXXX-XXXXXXX-X)"
          value={cnic}
          onChangeText={handleCnicChange}
          mode="outlined"
          keyboardType="numeric"
          outlineColor={COLORS.primary}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
          disabled={isLoading}
        />

        <Text style={styles.label}>Vehicle Type</Text>
        <SegmentedButtons
          value={vehicleType}
          onValueChange={setVehicleType}
          buttons={[
            { value: "van", label: "Van" },
            { value: "bus", label: "Bus" },
            { value: "coaster", label: "Coaster" },
          ]}
          style={styles.segmentedButtons}
        />

        <TextInput
          label="Vehicle Plate Number"
          value={plateNumber}
          onChangeText={setPlateNumber}
          mode="outlined"
          autoCapitalize="characters"
          outlineColor={COLORS.primary}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
          disabled={isLoading}
        />

        <TextInput
          label="Vehicle Capacity"
          value={capacity}
          onChangeText={setCapacity}
          mode="outlined"
          keyboardType="numeric"
          outlineColor={COLORS.primary}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
          disabled={isLoading}
        />

        {error && (
          <HelperText type="error" visible={!!error} style={styles.errorText}>
            {error}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
          contentStyle={styles.buttonContent}
          buttonColor={COLORS.primary}
        >
          Submit Profile
        </Button>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    paddingBottom: 10,
    alignItems: "center",
    paddingTop: SPACING.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.primary,
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  form: {
    width: "100%",
  },
  input: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  segmentedButtons: {
    marginBottom: SPACING.md,
  },
  errorText: {
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  button: {
    borderRadius: 8,
    marginTop: SPACING.lg,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

export default DriverProfileSetupScreen;
