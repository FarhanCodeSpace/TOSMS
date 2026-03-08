export type AuthStackParamList = {
  Login: undefined;
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
};

export type StudentMyRouteStackParamList = {
  MyRoute: undefined;
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
  MyRouteTab: undefined;
  MyRidesTab: undefined;
  ProfileTab: undefined;
};

export type DriverHomeStackParamList = {
  DriverHome: undefined;
  CreateRide: undefined;
  DriverAvailability: undefined;
};

export type DriverMyRouteStackParamList = {
  DriverMyRoute: undefined;
};

export type DriverActiveRideStackParamList = {
  ActiveRide: undefined;
  Passengers: { rideId: string };
  RideSummary: { rideId: string };
};

export type DriverProfileStackParamList = {
  DriverProfile: undefined;
};

export type DriverTabParamList = {
  HomeTab: undefined;
  MyRouteTab: undefined;
  ActiveRideTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Student: undefined;
  Driver: undefined;
  DriverPending: undefined;
};
