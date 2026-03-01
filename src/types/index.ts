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
 * Represents a stop along a ride route.
 */
export interface RideStop {
  stopName: string;
  order: number;
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
  status: "active" | "suspended";

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
 * Represents a Ride created by a driver.
 */
export interface Ride {
  rideId: string;
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
  totalSeats: number;
  availableSeats: number;
  farePerSeat: number;
  passengerIds: string[];
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
