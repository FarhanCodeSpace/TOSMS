export type AuthStackParamList = {
  Login: { successMessage?: string; email?: string } | undefined;
  Register: undefined;
  ForgotPassword: undefined;
  DriverProfileSetup: undefined;
  DriverPending: undefined;
};

export type StudentHomeStackParamList = {
  StudentHome: undefined;
  MyRoute: { routeId: string };
  FeePayment: undefined;
  ChallanView: { challanId: string };
  Availability: undefined;
  StudentAvailability: undefined;
  TrackRide: { rideId: string };
  Review: { rideId: string; driverId: string; driverName: string };
  ChallanDeposit: { challanId: string; challanNumber: string };
  PaymentHistory: undefined;
};

export type StudentMyRouteStackParamList = {
  MyRoute: undefined;
};

export type StudentRidesStackParamList = {
  RideHistory: undefined;
  TrackRide: { rideId: string };
  Review: { rideId: string; driverId: string; driverName: string };
};

export type StudentProfileStackParamList = {
  StudentProfile: undefined;
  EditProfile: undefined;
  PaymentHistory: undefined;
};

export type StudentTabParamList = {
  HomeTab: undefined;
  MyRouteTab: undefined;
  MyRidesTab: undefined;
  ProfileTab: undefined;
};

export type DriverHomeStackParamList = {
  DriverHome: undefined;
  DriverAvailability: undefined;
  ActiveRide: { rideId: string; routeId: string };
  Passengers: { rideId: string; routeId: string };
  RideSummary: { rideId: string };
  TodayStudents: { routeId: string; date: string };
  DriverProfile: undefined;
};

export type DriverMyRouteStackParamList = {
  DriverMyRoute: undefined;
};

export type DriverActiveRideStackParamList = {
  ActiveRide: { rideId: string; routeId: string };
  Passengers: { rideId: string; routeId: string };
  RideSummary: { rideId: string };
};

export type DriverProfileStackParamList = {
  DriverProfile: undefined;
};

export type DriverTabParamList = {
  HomeTab: undefined;
  MyRouteTab: undefined;
  ActiveRideTab: undefined;
  StudentsTab: { routeId?: string; date?: string };
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Student: undefined;
  Driver: undefined;
  DriverPending: undefined;
};
