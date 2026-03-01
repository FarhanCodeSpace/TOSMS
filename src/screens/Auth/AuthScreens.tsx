import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={styles.container}>
    <Text style={styles.text}>{name} Screen</Text>
  </View>
);

export const LoginScreen = () => <PlaceholderScreen name="Login" />;
export const RegisterScreen = () => <PlaceholderScreen name="Register" />;
export const ForgotPasswordScreen = () => <PlaceholderScreen name="Forgot Password" />;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  text: { fontSize: 18, fontWeight: 'bold', color: '#1A3C5E' },
});
