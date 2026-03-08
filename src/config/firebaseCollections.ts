export const COLLECTIONS = {
  USERS: "users",
  RIDES: "rides",
  BOOKINGS: "bookings",
  LIVE_LOCATIONS: "live_locations",
  PAYMENTS: "payments",
  NOTIFICATIONS: "notifications",
  REVIEWS: "reviews",
  ROUTES: "routes",
  AVAILABILITY: "availability",
  FEE_PAYMENTS: "feePayments",
  CHALLANS: "challans",
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;
