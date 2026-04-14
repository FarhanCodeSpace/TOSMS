import 'react-native-gesture-handler';
import { StatusBar } from "expo-status-bar";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { 
  MD3LightTheme, 
  PaperProvider, 
  adaptNavigationTheme 
} from "react-native-paper";
import { 
  NavigationContainer, 
  DefaultTheme as NavigationDefaultTheme 
} from "@react-navigation/native";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from "./src/context/AuthContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { navigationRef } from "./src/navigation/navigationRef";
import { COLORS } from "./src/constants/theme";

const { LightTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
});

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    onPrimary: COLORS.onPrimary,
    secondary: COLORS.accent,
    onSecondary: '#FFFFFF',
    background: COLORS.background,
    surface: COLORS.surface,
    onSurface: COLORS.onSurface,
    onSurfaceVariant: COLORS.onSurfaceVariant,
    error: COLORS.error,
    outline: COLORS.outline,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <StatusBar style="dark" backgroundColor="transparent" />
          <PaperProvider theme={theme}>
            <NavigationContainer ref={navigationRef} theme={LightTheme}>
              <RootNavigator />
            </NavigationContainer>
          </PaperProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
