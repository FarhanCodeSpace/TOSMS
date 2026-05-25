import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Text, TextInput, Button, Card } from "react-native-paper";
import { db } from "@config/firebase";
import { COLLECTIONS } from "@config/firebaseCollections";
import {
  collection,
  query,
  where,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "@hooks/useAuth";
import { COLORS, SPACING, FONTS } from "@constants/theme";
import {
  getPakistanTodayString,
  getPakistanTomorrowString,
  formatPakistanDate,
} from "@utils/dateHelpers";
import { format, addDays, subDays } from "date-fns";
import { StackNavigationProp } from "@react-navigation/stack";
import { StudentHomeStackParamList } from "@navigation/types";

type AvailabilityScreenProps = {
  navigation: StackNavigationProp<StudentHomeStackParamList, "Availability">;
};

export const AvailabilityScreen: React.FC<AvailabilityScreenProps> = ({
  navigation,
}) => {
  const { currentUser } = useAuth();

  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<Record<string, boolean | null>>({});

  const tomorrowString = getPakistanTomorrowString();
  const tomorrowDisplay = formatPakistanDate(tomorrowString);

  useEffect(() => {
    if (!currentUser?.uid) return;

    setIsLoading(true);

    const currentDocId = currentUser.uid + "_" + tomorrowString;
    const unsubscribeCurrent = onSnapshot(
      doc(db, COLLECTIONS.AVAILABILITY, currentDocId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setIsAvailable(data.isAvailable);
          setReason(data.note || "");
        } else {
          setIsAvailable(null);
          setReason("");
        }
        setIsLoading(false);
      },
      (e) => {
        console.error("Error fetching availability:", e);
        setIsLoading(false);
      },
    );

    const today = new Date();
    const pastDates = Array.from({ length: 7 }, (_, i) =>
      format(subDays(today, i), "yyyy-MM-dd"),
    );
    const historyQuery = query(
      collection(db, COLLECTIONS.AVAILABILITY),
      where("userId", "==", currentUser.uid),
      where("date", "in", pastDates),
    );
    const unsubscribeHistory = onSnapshot(
      historyQuery,
      (snap) => {
        const historyMap: Record<string, boolean> = {};
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          historyMap[data.date] = data.isAvailable;
        });
        setHistory(historyMap);
      },
      (e) => {
        console.error("Error fetching history:", e);
      },
    );

    return () => {
      unsubscribeCurrent();
      unsubscribeHistory();
    };
  }, [currentUser?.uid]);

  const handleConfirm = async () => {
    if (isSaving) return;

    if (isAvailable === null) {
      Alert.alert(
        "Selection Required",
        "Please select whether you are available or not.",
      );
      return;
    }

    if (!currentUser?.uid) return;

    setIsSaving(true);
    try {
      const dateString = getPakistanTomorrowString();
      const docId = currentUser.uid + "_" + dateString;
      const docRef = doc(db, COLLECTIONS.AVAILABILITY, docId);

      await setDoc(docRef, {
        availabilityId: docId,
        userId: currentUser.uid,
        userName: currentUser.fullName,
        routeId: currentUser.routeId || "",
        date: dateString,
        isAvailable: isAvailable,
        note: reason,
        markedAt: serverTimestamp(),
        role: "student",
      });

      Alert.alert("Success", "Availability marked successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.error("Error saving availability:", e);
      Alert.alert("Error", "Failed to save availability. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderHistoryChips = () => {
    const today = new Date();
    // Monday to Sunday order
    const days = Array.from({ length: 7 }, (_, i) => {
      // Get the last 7 days including today
      // Reversing so left to right is oldest to newest, but let's just do past 7 days intuitively
      // It's requested: "Show 7 day chips (Mon Tue Wed Thu Fri Sat Sun)" which implies a static week
      // For simplicity let's just show the last 7 days.
      return subDays(today, 6 - i);
    });

    return (
      <View style={styles.historyContainer}>
        {days.map((date, index) => {
          const dateStr = format(date, "yyyy-MM-dd");
          const dayName = format(date, "EEE");
          const isAvail = history[dateStr];

          let chipColor: string = "#E0E0E0"; // Grey default
          let textColor: string = COLORS.textSecondary;

          if (isAvail === true) {
            chipColor = "#E8F5E9"; // Green bg
            textColor = COLORS.success;
          } else if (isAvail === false) {
            chipColor = "#FFEBEE"; // Red bg
            textColor = COLORS.error;
          }

          return (
            <View
              key={index}
              style={[styles.chip, { backgroundColor: chipColor }]}
            >
              <Text style={[styles.chipText, { color: textColor }]}>
                {dayName}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: COLORS.background }}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Mark Your Availability</Text>
        <Text style={styles.subtitle}>
          Let admin know if you need transport tomorrow
        </Text>

        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>Tomorrow — {tomorrowDisplay}</Text>
        </View>

        <View style={styles.selectionRow}>
          <TouchableOpacity
            style={[
              styles.card,
              isAvailable === true && styles.cardSelectedAvailable,
            ]}
            onPress={() => setIsAvailable(true)}
          >
            <Text style={styles.cardIcon}>✅</Text>
            <Text
              style={[
                styles.cardText,
                isAvailable === true && {
                  color: COLORS.success,
                  fontWeight: "bold",
                },
              ]}
            >
              I am Available
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.card,
              isAvailable === false && styles.cardSelectedNotAvailable,
            ]}
            onPress={() => setIsAvailable(false)}
          >
            <Text style={styles.cardIcon}>❌</Text>
            <Text
              style={[
                styles.cardText,
                isAvailable === false && {
                  color: COLORS.error,
                  fontWeight: "bold",
                },
              ]}
            >
              Not Available
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          mode="outlined"
          label="Add a reason (optional)"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
          style={styles.input}
          outlineColor={COLORS.primary}
          activeOutlineColor={COLORS.primary}
        />

        <TouchableOpacity
          style={[
            styles.confirmButton,
            isSaving && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={isSaving || isAvailable === null}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm</Text>
          )}
        </TouchableOpacity>

        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>This Week's History</Text>
          {renderHistoryChips()}
        </View>

        <Text style={styles.reminderText}>
          Please mark your availability before 10:00 PM each night.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 10 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: {
    fontSize: FONTS.xxl,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  dateContainer: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.xl,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    elevation: 1,
  },
  dateText: { fontSize: FONTS.lg, fontWeight: "bold", color: COLORS.text },
  selectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    elevation: 2,
  },
  cardSelectedAvailable: {
    borderColor: COLORS.success,
    backgroundColor: "#F1F8E9",
  },
  cardSelectedNotAvailable: {
    borderColor: COLORS.error,
    backgroundColor: "#FFEBEE",
  },
  cardIcon: { fontSize: 32, marginBottom: SPACING.sm },
  cardText: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  input: { marginBottom: SPACING.xl, backgroundColor: COLORS.surface },
  confirmButton: {
    minHeight: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginBottom: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: "white",
    fontWeight: "700",
  },
  historySection: { marginTop: SPACING.md, marginBottom: SPACING.xl },
  historyTitle: {
    fontSize: FONTS.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  historyContainer: { flexDirection: "row", justifyContent: "space-between" },
  chip: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
  },
  chipText: { fontSize: FONTS.sm, fontWeight: "600" },
  reminderText: {
    textAlign: "center",
    color: "#8A6D3B", // Warning color
    fontSize: FONTS.sm,
    fontStyle: "italic",
    marginTop: "auto",
    backgroundColor: "#FCF8E3",
    padding: SPACING.md,
    borderRadius: 8,
  },
});

export default AvailabilityScreen;
