import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { AuthStackParamList } from "./types";
import {
  LoginScreen,
  RegisterScreen,
  ForgotPasswordScreen,
  DriverProfileSetupScreen,
} from "@screens/Auth";
import { DriverPendingScreen } from "@screens/Shared";

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator = ({
  initialRoute = "Login",
}: {
  initialRoute?: keyof AuthStackParamList;
}) => {
  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen
        name="DriverProfileSetup"
        component={DriverProfileSetupScreen}
      />
      <Stack.Screen name="DriverPending" component={DriverPendingScreen} />
    </Stack.Navigator>
  );
};
