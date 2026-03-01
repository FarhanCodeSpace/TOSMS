import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import {
  StudentTabParamList,
  StudentHomeStackParamList,
  StudentRidesStackParamList,
  StudentProfileStackParamList,
} from "./types";
import {
  StudentHomeScreen,
  RideDetailScreen,
  SeatSelectionScreen,
  PaymentScreen,
  BookingConfirmScreen,
  RideHistoryScreen,
  TrackRideScreen,
  StudentProfileScreen,
  EditProfileScreen,
} from "@screens/Student/StudentScreens";
import { COLORS } from "@constants/theme";

const Tab = createBottomTabNavigator<StudentTabParamList>();
const HomeStack = createStackNavigator<StudentHomeStackParamList>();
const RidesStack = createStackNavigator<StudentRidesStackParamList>();
const ProfileStack = createStackNavigator<StudentProfileStackParamList>();

const HomeStackNavigator = () => (
  <HomeStack.Navigator>
    <HomeStack.Screen
      name="StudentHome"
      component={StudentHomeScreen}
      options={{ title: "Home" }}
    />
    <HomeStack.Screen
      name="RideDetail"
      component={RideDetailScreen}
      options={{ title: "Ride Details" }}
    />
    <HomeStack.Screen
      name="SeatSelection"
      component={SeatSelectionScreen}
      options={{ title: "Select Seat" }}
    />
    <HomeStack.Screen
      name="Payment"
      component={PaymentScreen}
      options={{ title: "Payment" }}
    />
    <HomeStack.Screen
      name="BookingConfirm"
      component={BookingConfirmScreen}
      options={{ title: "Booking Confirmed" }}
    />
  </HomeStack.Navigator>
);

const RidesStackNavigator = () => (
  <RidesStack.Navigator>
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
  <ProfileStack.Navigator>
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
          else if (route.name === "MyRidesTab") iconName = "car";
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
        name="MyRidesTab"
        component={RidesStackNavigator}
        options={{ tabBarLabel: "My Rides" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
};
