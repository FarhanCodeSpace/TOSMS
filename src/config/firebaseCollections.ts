export const COLLECTIONS = {
  USERS: "users",
  RIDES: "rides",
  BOOKINGS: "bookings",
  LIVE_LOCATIONS: "live_locations",
  PAYMENTS: "payments",
  NOTIFICATIONS: "notifications",
  REVIEWS: "reviews",
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;
