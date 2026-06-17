import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Text, Card } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { db } from "@config/firebase";
import { COLLECTIONS } from "@config/firebaseCollections";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  limit,
} from "firebase/firestore";
import { useAuth } from "@hooks/useAuth";
import { COLORS, SPACING, FONTS } from "@constants/theme";
import { formatPKR } from "@utils/formatters";
import { getPakistanTodayString } from "@utils/dateHelpers";
import { getAuth } from "firebase/auth";
import LoadingSpinner from "@components/common/LoadingSpinner";
import EmptyState from "@components/common/EmptyState";
import StatusBadge from "@components/common/StatusBadge";
import { Timestamp } from "firebase/firestore";
import { Ride } from "../../types";

interface RideRecord extends Ride {
  rideId: string;
}

type RideFilter = "all" | "today" | "past";

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

const toSafeDate = (value: unknown): Date | null => {
  if (!value) return null;

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      const converted = (value as Timestamp).toDate();
      return Number.isNaN(converted.getTime()) ? null : converted;
    } catch {
      return null;
    }
  }

  return null;
};

const formatTimeOnly = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "Time not set";

  if (/^\d{1,2}(?::\d{2})?\s?(AM|PM)$/i.test(trimmed)) {
    return trimmed.toUpperCase().replace(/\s+/g, " ");
  }

  const parsed = toSafeDate(trimmed);
  if (!parsed) return trimmed;

  return parsed.toLocaleTimeString("en-PK", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getPakistanDateKey = (value: unknown): string | null => {
  const date = toSafeDate(value);
  if (!date) return null;

  const pakistanTime = new Date(date.getTime() + PKT_OFFSET_MS);
  return pakistanTime.toISOString().split("T")[0];
};

const getRideTimestamp = (ride: RideRecord): number => {
  const sources = [ride.departureTime, ride.createdAt, ride.date];
  for (const source of sources) {
    const date = toSafeDate(source);
    if (date) return date.getTime();
  }
  return 0;
};

const getRideDateLabel = (ride: RideRecord): string => {
  const dateSource = ride.date || ride.departureTime || ride.createdAt;

  if (typeof ride.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ride.date)) {
    const directDate = toSafeDate(ride.date);
    if (directDate) {
      const dateKey = getPakistanDateKey(directDate);
      if (dateKey === getPakistanTodayString()) return "Today";

      return directDate.toLocaleDateString("en-PK", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  const date = toSafeDate(dateSource);
  if (!date) return "Date not set";

  const dateKey = getPakistanDateKey(date);
  const todayKey = getPakistanTodayString();

  if (dateKey === todayKey) return "Today";

  return date.toLocaleDateString("en-PK", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getRideTimeLabel = (ride: RideRecord): string => {
  const timeSource = ride.departureTime;
  if (typeof timeSource === "string") {
    return formatTimeOnly(timeSource);
  }

  const date = toSafeDate(timeSource);
  if (!date) return "Time not set";

  return date.toLocaleTimeString("en-PK", {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const RideHistoryScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState<RideRecord[]>([]);
  const [routeName, setRouteName] = useState("Loading...");
  const [routeId, setRouteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<RideFilter>("all");

  useEffect(() => {
    if (!currentUser?.uid) return;

    let isMounted = true;

    const fetchRoute = async () => {
      try {
        const routeQuery = query(
          collection(db, COLLECTIONS.ROUTES),
          where("studentIds", "array-contains", currentUser.uid),
          limit(1),
        );
        const routeSnap = await getDocs(routeQuery);

        if (!isMounted) return;

        if (routeSnap.empty) {
          setRouteId(null);
          setRouteName("No Route");
          setLoading(false);
          return;
        }

        const routeDoc = routeSnap.docs[0];
        setRouteId(routeDoc.id);
        setRouteName(routeDoc.data().routeName || "My Route");
      } catch {
        if (isMounted) {
          setRouteId(null);
          setRouteName("No Route");
          setLoading(false);
        }
      }
    };

    fetchRoute();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!routeId) return;

    const q = query(
      collection(db, COLLECTIONS.RIDES),
      where("routeId", "==", routeId),
    );

    const auth = getAuth();
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!auth.currentUser) return;
        const data: RideRecord[] = snap.docs
          .map((d) => ({
            rideId: d.id,
            ...(d.data() as RideRecord),
          }))
          .sort(
            (left, right) => getRideTimestamp(right) - getRideTimestamp(left),
          );

        setRecords(data);
        setLoading(false);
      },
      (error: any) => {
        if (error.code === "permission-denied") return;
        setLoading(false);
      },
    );

    return () => unsub();
  }, [routeId]);

  const filteredRecords = useMemo(() => {
    const todayKey = getPakistanTodayString();

    return records.filter((ride) => {
      const rideDateKey = getPakistanDateKey(
        ride.date || ride.departureTime || ride.createdAt,
      );

      if (activeFilter === "today") {
        return rideDateKey === todayKey;
      }

      if (activeFilter === "past") {
        return rideDateKey
          ? rideDateKey < todayKey
          : ride.status === "completed";
      }

      return true;
    });
  }, [activeFilter, records]);

  const todayCount = useMemo(
    () =>
      records.filter((ride) => {
        const rideDateKey = getPakistanDateKey(
          ride.date || ride.departureTime || ride.createdAt,
        );
        return rideDateKey === getPakistanTodayString();
      }).length,
    [records],
  );

  const pastCount = useMemo(
    () =>
      records.filter((ride) => {
        const rideDateKey = getPakistanDateKey(
          ride.date || ride.departureTime || ride.createdAt,
        );
        return rideDateKey
          ? rideDateKey < getPakistanTodayString()
          : ride.status === "completed";
      }).length,
    [records],
  );

  const upcomingCount = Math.max(records.length - todayCount - pastCount, 0);

  const totalRides = records.length;

  const renderItem = ({ item }: { item: RideRecord }) => {
    const completedSeats = item.totalSeats - item.availableSeats;
    const timeLabel = getRideTimeLabel(item);
    const dateLabel = getRideDateLabel(item);

    return (
      <Card style={styles.card}>
        <View
          style={[
            styles.cardAccent,
            {
              backgroundColor:
                item.status === "completed"
                  ? "#9CA3AF"
                  : item.status === "active"
                    ? "#16A34A"
                    : item.status === "scheduled"
                      ? COLORS.primary
                      : "#DC2626",
            },
          ]}
        />
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.headerCopy}>
              <Text style={styles.routeText} numberOfLines={1}>
                {item.routeName || routeName}
              </Text>
              <Text style={styles.dateText}>{dateLabel}</Text>
              <Text style={styles.timeText}>{timeLabel}</Text>
            </View>
            <StatusBadge status={item.status} size="sm" />
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoPill}>
              <MaterialCommunityIcons
                name="account-tie"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.infoText} numberOfLines={1}>
                {item.driverName || "Driver not set"}
              </Text>
            </View>

            <View style={styles.infoPill}>
              <MaterialCommunityIcons name="cash" size={16} color="#16A34A" />
              <Text style={styles.infoText}>
                {formatPKR(item.farePerSeat || 0)}
              </Text>
            </View>

            <View style={styles.infoPill}>
              <MaterialCommunityIcons name="seat" size={16} color="#F59E0B" />
              <Text style={styles.infoText}>
                {completedSeats}/{item.totalSeats} booked
              </Text>
            </View>

            <View style={styles.infoPill}>
              <MaterialCommunityIcons
                name="map-marker-path"
                size={16}
                color="#7C3AED"
              />
              <Text style={styles.infoText} numberOfLines={1}>
                {item.vehiclePlate || "Vehicle not set"}
              </Text>
            </View>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              Seats {item.availableSeats} available of {item.totalSeats}
            </Text>
            <Text style={styles.footerText}>
              {timeLabel === "Time not set"
                ? "No time stored"
                : typeof item.departureTime === "string"
                  ? "Time stored as text"
                  : "Scheduled ride"}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View>
          <Text style={styles.heroLabel}>Ride History</Text>
          <Text style={styles.heroTitle}>{routeName}</Text>
          <Text style={styles.heroSubtitle}>
            Real ride documents for your assigned route.
          </Text>
        </View>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatPill}>
            <Text style={styles.heroStatValue}>{totalRides}</Text>
            <Text style={styles.heroStatLabel}>Total</Text>
          </View>
          <View style={styles.heroStatPill}>
            <Text style={styles.heroStatValue}>{todayCount}</Text>
            <Text style={styles.heroStatLabel}>Today</Text>
          </View>
          <View style={styles.heroStatPill}>
            <Text style={styles.heroStatValue}>{pastCount}</Text>
            <Text style={styles.heroStatLabel}>Past</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterRow}>
        {(["all", "today", "past"] as RideFilter[]).map((filter) => {
          const label =
            filter === "all" ? "All" : filter === "today" ? "Today" : "Past";
          const active = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter)}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.filterText, active && styles.filterTextActive]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.rideId}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            iconName="history"
            title="No rides for this filter"
            subtitle="Try switching to another filter or wait for the next ride to be created."
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  heroCard: {
    margin: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: 22,
    padding: SPACING.lg,
    backgroundColor: COLORS.primary,
    overflow: "hidden",
  },
  heroLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: FONTS.xs,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  heroTitle: {
    color: "white",
    fontSize: FONTS.xxl,
    fontWeight: "800",
    marginTop: 4,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: FONTS.sm,
    marginTop: 6,
    maxWidth: "92%",
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  heroStatPill: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  heroStatValue: {
    color: "white",
    fontSize: 20,
    fontWeight: "800",
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: SPACING.md,
    paddingBottom: 8,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
  },
  filterChipActive: {
    backgroundColor: COLORS.text,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: "white",
  },
  listContent: {
    padding: SPACING.md,
    paddingTop: 6,
    paddingBottom: SPACING.xl,
  },
  card: {
    marginBottom: SPACING.md,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    elevation: 3,
    overflow: "hidden",
  },
  cardAccent: {
    height: 5,
    width: "100%",
  },
  cardContent: {
    paddingTop: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 8,
  },
  routeText: {
    fontSize: FONTS.lg,
    fontWeight: "800",
    color: COLORS.text,
  },
  dateText: {
    fontSize: FONTS.sm,
    color: COLORS.primary,
    fontWeight: "700",
    marginTop: 4,
  },
  timeText: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  infoPill: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  emptyContainer: { alignItems: "center", paddingTop: 80 },
  emptyTitle: {
    fontSize: FONTS.xl,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.md,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: SPACING.lg,
  },
});

export default RideHistoryScreen;
