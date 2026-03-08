import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import {
  DriverTabParamList,
  DriverHomeStackParamList,
  DriverActiveRideStackParamList,
  DriverProfileStackParamList,
  DriverMyRouteStackParamList,
} from "./types";
import {
  DriverHomeScreen,
  CreateRideScreen,
  ActiveRideScreen,
  PassengersScreen,
  RideSummaryScreen,
  DriverProfileScreen,
  DriverAvailabilityScreen,
  DriverMyRouteScreen,
} from "@screens/Driver";
import { COLORS } from "@constants/theme";

const Tab = createBottomTabNavigator<DriverTabParamList>();
const HomeStack = createStackNavigator<DriverHomeStackParamList>();
const ActiveRideStack = createStackNavigator<DriverActiveRideStackParamList>();
const ProfileStack = createStackNavigator<DriverProfileStackParamList>();
const MyRouteStack = createStackNavigator<DriverMyRouteStackParamList>();

const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen
      name="DriverHome"
      component={DriverHomeScreen}
      options={{ title: "Home" }}
    />
    <HomeStack.Screen
      name="CreateRide"
      component={CreateRideScreen}
      options={{ title: "Create Ride" }}
    />
    <HomeStack.Screen
      name="DriverAvailability"
      component={DriverAvailabilityScreen}
      options={{ title: "Availability" }}
    />
  </HomeStack.Navigator>
);

const MyRouteStackNavigator = () => (
  <MyRouteStack.Navigator screenOptions={{ headerShown: false }}>
    <MyRouteStack.Screen
      name="DriverMyRoute"
      component={DriverMyRouteScreen}
      options={{ title: "My Route" }}
    />
  </MyRouteStack.Navigator>
);

const ActiveRideStackNavigator = () => (
  <ActiveRideStack.Navigator screenOptions={{ headerShown: false }}>
    <ActiveRideStack.Screen
      name="ActiveRide"
      component={ActiveRideScreen}
      options={{ title: "Active Ride" }}
    />
    <ActiveRideStack.Screen
      name="Passengers"
      component={PassengersScreen}
      options={{ title: "Passengers" }}
    />
    <ActiveRideStack.Screen
      name="RideSummary"
      component={RideSummaryScreen}
      options={{ title: "Ride Summary" }}
    />
  </ActiveRideStack.Navigator>
);

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen
      name="DriverProfile"
      component={DriverProfileScreen}
      options={{ title: "Profile" }}
    />
  </ProfileStack.Navigator>
);

export const DriverNavigator = () => {
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
          else if (route.name === "ActiveRideTab") iconName = "play-circle";
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
        name="ActiveRideTab"
        component={ActiveRideStackNavigator}
        options={{ tabBarLabel: "Active Ride" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
};
