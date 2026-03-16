import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import {
  StudentTabParamList,
  StudentHomeStackParamList,
  StudentRidesStackParamList,
  StudentProfileStackParamList,
  StudentMyRouteStackParamList,
} from "./types";
import {
  StudentHomeScreen,
  RideHistoryScreen,
  TrackRideScreen,
  StudentProfileScreen,
  EditProfileScreen,
} from "@screens/Student/StudentScreens";
import {
  MyRouteScreen,
  AvailabilityScreen,
  StudentAvailabilityScreen,
} from "@screens/Student/StudentScreens";
import {
  FeePaymentScreen,
  ChallanViewScreen,
  ChallanDepositScreen,
  PaymentHistoryScreen
} from "@screens/Student/StudentScreens";
import { COLORS } from "@constants/theme";

const Tab = createBottomTabNavigator<StudentTabParamList>();
const HomeStack = createStackNavigator<StudentHomeStackParamList>();
const RidesStack = createStackNavigator<StudentRidesStackParamList>();
const ProfileStack = createStackNavigator<StudentProfileStackParamList>();
const MyRouteStack = createStackNavigator<StudentMyRouteStackParamList>();

const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen
      name="StudentHome"
      component={StudentHomeScreen}
      options={{ headerShown: false }}
    />
    <HomeStack.Screen
      name="FeePayment"
      component={FeePaymentScreen}
      options={{ title: "Pay Fee" }}
    />
    <HomeStack.Screen
      name="ChallanView"
      component={ChallanViewScreen}
      options={{ title: "View Challan" }}
    />
    <HomeStack.Screen
      name="ChallanDeposit"
      component={ChallanDepositScreen}
      options={{ title: "Submit Deposit" }}
    />
    <HomeStack.Screen
      name="PaymentHistory"
      component={PaymentHistoryScreen}
      options={{ title: "Payment History" }}
    />
    <HomeStack.Screen
      name="Availability"
      component={AvailabilityScreen}
      options={{ title: "Availability" }}
    />
    <HomeStack.Screen
      name="StudentAvailability"
      component={StudentAvailabilityScreen}
      options={{ headerShown: false }}
    />
    <HomeStack.Screen
      name="TrackRide"
      component={TrackRideScreen}
      options={{ title: "Track Ride" }}
    />
  </HomeStack.Navigator>
);

const MyRouteStackNavigator = () => (
  <MyRouteStack.Navigator screenOptions={{ headerShown: false }}>
    <MyRouteStack.Screen
      name="MyRoute"
      component={MyRouteScreen}
      options={{ title: "My Route" }}
    />
  </MyRouteStack.Navigator>
);

const RidesStackNavigator = () => (
  <RidesStack.Navigator screenOptions={{ headerShown: false }}>
    <RidesStack.Screen
      name="RideHistory"
      component={RideHistoryScreen}
      options={{ title: "My Rides" }}
    />
    <RidesStack.Screen
      name="TrackRide"
      component={TrackRideScreen}
      options={{ title: "Track Ride" }}
    />
  </RidesStack.Navigator>
);

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen
      name="StudentProfile"
      component={StudentProfileScreen}
      options={{ title: "Profile" }}
    />
    <ProfileStack.Screen
      name="EditProfile"
      component={EditProfileScreen}
      options={{ title: "Edit Profile" }}
    />
  </ProfileStack.Navigator>
);

export const StudentNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: "gray",
        tabBarIcon: ({ color, size }) => {
          let iconName = "home";
          if (route.name === "HomeTab") iconName = "home";
          else if (route.name === "MyRouteTab") iconName = "map-marker";
          else if (route.name === "MyRidesTab") iconName = "history";
          else if (route.name === "ProfileTab") iconName = "account";
          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="MyRouteTab"
        component={MyRouteStackNavigator}
        options={{ tabBarLabel: "My Route" }}
      />
      <Tab.Screen
        name="MyRidesTab"
        component={RidesStackNavigator}
        options={{ tabBarLabel: "History" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
};
