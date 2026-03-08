import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { COLORS, FONTS } from '@constants/theme';

const PlaceholderScreen: React.FC<{ title: string; icon: string }> = ({ title, icon }) => (
  <View style={styles.container}>
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.sub}>Coming soon...</Text>
  </View>
);

// Reserved for future placeholders
export const DummyDriverPlaceholder = () => <PlaceholderScreen icon="🚗" title="Dummy" />;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: FONTS.xxl, fontWeight: 'bold', color: COLORS.primary, marginBottom: 8 },
  sub: { fontSize: FONTS.md, color: COLORS.textSecondary },
});
