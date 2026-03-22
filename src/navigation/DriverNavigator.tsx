import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DriverTabParamList,
  DriverHomeStackParamList,
  DriverActiveRideStackParamList,
  DriverProfileStackParamList,
  DriverMyRouteStackParamList,
} from "./types";
import {
  DriverHomeScreen,
  ActiveRideScreen,
  PassengersScreen,
  RideSummaryScreen,
  DriverProfileScreen,
  DriverAvailabilityScreen,
  DriverMyRouteScreen,
  TodayStudentsScreen,
} from "@screens/Driver";
import { COLORS } from "@constants/theme";

const Tab = createBottomTabNavigator<DriverTabParamList>();
const HomeStack = createStackNavigator<DriverHomeStackParamList>();
const ActiveRideStack = createStackNavigator<DriverActiveRideStackParamList>();
const MyRouteStack = createStackNavigator<DriverMyRouteStackParamList>();

const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen
      name="DriverHome"
      component={DriverHomeScreen}
      options={{ title: "Home" }}
    />
    <HomeStack.Screen
      name="DriverAvailability"
      component={DriverAvailabilityScreen}
      options={{ title: "Availability" }}
    />
    <HomeStack.Screen
      name="ActiveRide"
      component={ActiveRideScreen}
      options={{ title: "Active Ride" }}
    />
    <HomeStack.Screen
      name="Passengers"
      component={PassengersScreen}
      options={{ title: "Passengers" }}
    />
    <HomeStack.Screen
      name="RideSummary"
      component={RideSummaryScreen}
      options={{ title: "Ride Summary" }}
    />
    <HomeStack.Screen
      name="TodayStudents"
      component={TodayStudentsScreen}
      options={{ title: "Today's Students" }}
    />
    <HomeStack.Screen
      name="DriverProfile"
      component={DriverProfileScreen}
      options={{ title: "Profile", headerShown: true }}
    />
  </HomeStack.Navigator>
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

export const DriverNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: any = "home";
          if (route.name === "HomeTab") iconName = "home-variant";
          else if (route.name === "MyRouteTab") iconName = "map-marker-path";
          else if (route.name === "ActiveRideTab") iconName = "play-circle-outline";
          else if (route.name === "StudentsTab") iconName = "account-group";
          else if (route.name === "ProfileTab") iconName = "account-circle-outline";
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
        component={DriverMyRouteScreen}
        options={{ tabBarLabel: "My Route" }}
      />
      <Tab.Screen
        name="ActiveRideTab"
        component={ActiveRideStackNavigator}
        options={{ tabBarLabel: "Active" }}
      />
      <Tab.Screen
        name="StudentsTab"
        component={TodayStudentsScreen}
        options={{ tabBarLabel: "Students" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={DriverProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
};
