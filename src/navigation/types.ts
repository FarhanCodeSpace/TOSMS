export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  DriverProfileSetup: undefined;
  DriverPending: undefined;
};

export type StudentHomeStackParamList = {
  StudentHome: undefined;
  RideDetail: { rideId: string };
  SeatSelection: { rideId: string };
  Payment: { rideId: string; seatNumbers: number[] };
  BookingConfirm: { bookingId: string };
};

export type StudentRidesStackParamList = {
  RideHistory: undefined;
  TrackRide: { rideId: string };
};

export type StudentProfileStackParamList = {
  StudentProfile: undefined;
  EditProfile: undefined;
};

export type StudentTabParamList = {
  HomeTab: undefined;
  MyRidesTab: undefined;
  ProfileTab: undefined;
};

export type DriverHomeStackParamList = {
  DriverHome: undefined;
  CreateRide: undefined;
};

export type DriverActiveRideStackParamList = {
  ActiveRide: undefined;
  Passengers: { rideId: string };
  RideSummary: { rideId: string };
};

export type DriverEarningsStackParamList = {
  Earnings: undefined;
};

export type DriverProfileStackParamList = {
  DriverProfile: undefined;
};

export type DriverTabParamList = {
  HomeTab: undefined;
  ActiveRideTab: undefined;
  EarningsTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Student: undefined;
  Driver: undefined;
  DriverPending: undefined;
};
