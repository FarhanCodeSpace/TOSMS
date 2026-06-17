import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Text, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { db } from "@config/firebase";
import { COLLECTIONS } from "@config/firebaseCollections";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@hooks/useAuth";
import { COLORS, SPACING, FONTS } from "@constants/theme";
import { StackScreenProps } from "@react-navigation/stack";
import { StudentHomeStackParamList } from "@navigation/types";
import { CommonActions } from "@react-navigation/native";
import { User } from "@types";
import AvatarComponent from "@components/common/Avatar";

type ReviewScreenProps = StackScreenProps<StudentHomeStackParamList, "Review">;

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  route,
  navigation,
}) => {
  const { rideId, driverId, driverName: initialDriverName } = route.params;
  const { currentUser } = useAuth();

  const [driverData, setDriverData] = useState<User | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayName = driverData?.fullName || initialDriverName || "Driver";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // Fetch full driver profile
  useEffect(() => {
    const fetchDriver = async () => {
      if (driverId) {
        try {
          const snap = await getDoc(doc(db, COLLECTIONS.USERS, driverId));
          if (snap.exists()) {
            setDriverData(snap.data() as User);
          }
        } catch {
          // silently handle error
        }
      }
    };
    fetchDriver();
  }, [driverId]);

  const handleSubmit = async () => {
    if (rating === 0 || !driverId || !rideId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const newReview = {
        studentId: currentUser?.uid || "anonymous",
        studentName: currentUser?.fullName || "Anonymous Student",
        driverId,
        rideId,
        rating,
        comment: comment || "",
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, COLLECTIONS.REVIEWS), newReview);

      // Reset loading state before showing success popup
      setIsSubmitting(false);

      Alert.alert(
        "Success",
        "Review submitted! Thank you.",
        [
          {
            text: "OK",
            onPress: () => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "StudentHome" }],
                }),
              );
            },
          },
        ],
        { cancelable: false },
      );
    } catch {
      Alert.alert("Error", "Failed to submit review. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "StudentHome" }],
      }),
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={COLORS.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Your Ride</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.driverCard}>
          <AvatarComponent
            imageUrl={driverData?.profileImageUrl}
            name={displayName}
            size={64}
          />
          <Text style={styles.driverName}>{displayName}</Text>
          <Text style={styles.subText}>How was your ride?</Text>
        </View>

        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <MaterialCommunityIcons
                name={star <= rating ? "star" : "star-outline"}
                size={40}
                color={star <= rating ? "#F59E0B" : "#D1D5DB"}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          multiline
          numberOfLines={4}
          placeholder="Share your experience (optional)"
          value={comment}
          onChangeText={setComment}
          textAlignVertical="top"
        />

        <Button
          mode="contained"
          onPress={isSubmitting ? undefined : handleSubmit}
          disabled={!isSubmitting && rating === 0}
          style={[
            styles.submitBtn,
            rating === 0 && !isSubmitting && { backgroundColor: "#D1D5DB" },
            isSubmitting && { backgroundColor: COLORS.primary },
          ]}
          contentStyle={{ paddingVertical: 14 }}
          buttonColor={COLORS.primary}
        >
          {isSubmitting ? (
            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
              Submitting...
            </Text>
          ) : (
            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
              Submit Review
            </Text>
          )}
        </Button>

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "white",
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  scrollContent: { padding: 20, alignItems: "center" },
  driverCard: { alignItems: "center", marginTop: 20 },
  driverName: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 12,
  },
  subText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  ratingRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
    justifyContent: "center",
  },
  input: {
    width: "100%",
    height: 120,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginTop: 30,
    fontSize: 14,
    color: COLORS.text,
  },
  submitBtn: {
    width: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    marginTop: 30,
  },
  skipBtn: { marginTop: 20, padding: 10 },
  skipText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: "500" },
});

export default ReviewScreen;
