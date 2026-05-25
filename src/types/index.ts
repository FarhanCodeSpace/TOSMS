import { Timestamp } from "firebase/firestore";

/**
 * Represents a location with coordinates and a descriptive name.
 */
export interface Location {
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Represents a stop along a route.
 */
export interface RideStop {
  stopName: string;
  order: number;
  coordinates?: { latitude: number; longitude: number };
}

/**
 * Core User interface for the TOSMS app.
 * Supports both 'student' and 'driver' roles.
 */
export interface User {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: "student" | "driver";
  profileImageUrl: string | null;
  fcmToken: string | null;
  expoPushToken: string | null;
  createdAt: Timestamp;
  status: "active" | "pending" | "suspended";

  // Student-specific fields (assigned by admin)
  routeId?: string;
  pickupStop?: string;

  // Driver specific extra fields
  vehicleType?: "van" | "bus" | "coaster";
  vehiclePlate?: string;
  vehicleCapacity?: number;
  cnic?: string;
  approved?: boolean;
  rating?: number;
  totalRides?: number;
  profileComplete?: boolean;
}

/**
 * Represents a corporate transport Route managed by admin.
 */
export interface Route {
  routeId: string;
  routeName: string;
  description?: string;
  stops: {
    stopName: string;
    order: number;
    coordinates: { latitude: number; longitude: number };
  }[];
  assignedDriverId?: string;
  assignedDriverName?: string;
  studentIds: string[];
  departureTime: string;
  returnTime?: string;
  feeAmount: number;
  isActive: boolean;
  createdAt: Timestamp;
}

/**
 * Represents a daily availability record for student or driver.
 */
export interface Availability {
  availabilityId?: string;
  userId: string;
  userName: string;
  routeId: string;
  date: string; // 'YYYY-MM-DD'
  isAvailable: boolean;
  note?: string;
  role: "student" | "driver";
  vehicleAvailable?: boolean; // Driver-only
  markedAt: Timestamp;
}

/**
 * Represents a fee payment record for a student.
 */
export interface FeePayment {
  paymentId?: string;
  studentId: string;
  studentName: string;
  routeId: string;
  month: string; // 'YYYY-MM'
  amount: number;
  paymentMethod: "bank_challan" | "easypaisa" | "jazzcash";
  paymentStatus: "pending" | "submitted" | "verified";
  challanNumber?: string;
  transactionId?: string;
  submittedAt?: Timestamp;
  verifiedAt?: Timestamp;
  receiptImageUrl?: string;
}

/**
 * Represents a payment challan generated for a student.
 */
export interface Challan {
  challanId?: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  routeId: string;
  routeName: string;
  month: string; // 'YYYY-MM'
  amount: number;
  challanNumber: string;
  status: "generated" | "deposited" | "verified";
  generatedAt: Timestamp;
  receiptImageUrl?: string;
}

/**
 * Represents a Ride created by a driver on a specific date.
 */
export interface Ride {
  rideId: string;
  routeId?: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverRating: number;
  vehicleType: "van" | "bus" | "coaster";
  vehiclePlate: string;
  routeName: string;
  startLocation: Location;
  endLocation: Location;
  stops: RideStop[];
  departureTime: Timestamp;
  date?: string; // 'YYYY-MM-DD'
  totalSeats: number;
  availableSeats: number;
  farePerSeat: number;
  passengerIds: string[];
  completedStudentIds?: string[];
  seatMap: Record<
    number,
    {
      studentId: string | null;
      studentName: string | null;
      status: "available" | "booked";
    }
  >;
  status: "scheduled" | "active" | "completed" | "cancelled";
  createdAt: Timestamp;
}

/**
 * Represents a booking made by a student for a specific ride.
 */
export interface Booking {
  bookingId: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  rideId: string;
  routeName?: string;
  driverId: string;
  seatNumber: number;
  pickupStop: string;
  fareAmount: number;
  paymentStatus: "pending" | "paid" | "refunded" | "cash_pending";
  paymentIntentId: string | null;
  status: "confirmed" | "cancelled" | "completed" | "boarded";
  bookedAt: Timestamp;
}

/**
 * Represents real-time location tracking for a driver/ride.
 */
export interface LiveLocation {
  driverId: string;
  rideId: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  updatedAt: Timestamp;
}
