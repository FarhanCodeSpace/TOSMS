import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import {
  DriverTabParamList,
  DriverHomeStackParamList,
  DriverActiveRideStackParamList,
  DriverEarningsStackParamList,
  DriverProfileStackParamList,
} from "./types";
import {
  DriverHomeScreen,
  CreateRideScreen,
  ActiveRideScreen,
  PassengersScreen,
  RideSummaryScreen,
  EarningsScreen,
  DriverProfileScreen,
} from "@screens/Driver/DriverScreens";
import { COLORS } from "@constants/theme";

const Tab = createBottomTabNavigator<DriverTabParamList>();
const HomeStack = createStackNavigator<DriverHomeStackParamList>();
const ActiveRideStack = createStackNavigator<DriverActiveRideStackParamList>();
const EarningsStack = createStackNavigator<DriverEarningsStackParamList>();
const ProfileStack = createStackNavigator<DriverProfileStackParamList>();

const HomeStackNavigator = () => (
  <HomeStack.Navigator>
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
  </HomeStack.Navigator>
);

const ActiveRideStackNavigator = () => (
  <ActiveRideStack.Navigator>
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

const EarningsStackNavigator = () => (
  <EarningsStack.Navigator>
    <EarningsStack.Screen
      name="Earnings"
      component={EarningsScreen}
      options={{ title: "Earnings" }}
    />
  </EarningsStack.Navigator>
);

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator>
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
          else if (route.name === "ActiveRideTab") iconName = "play-circle";
          else if (route.name === "EarningsTab") iconName = "cash";
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
        name="ActiveRideTab"
        component={ActiveRideStackNavigator}
        options={{ tabBarLabel: "Active Ride" }}
      />
      <Tab.Screen
        name="EarningsTab"
        component={EarningsStackNavigator}
        options={{ tabBarLabel: "Earnings" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
};
