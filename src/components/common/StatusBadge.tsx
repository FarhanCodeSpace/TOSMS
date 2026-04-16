import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface StatusConfig {
  color: string;
  label: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  active:      { color: '#16A34A', label: 'Active' },
  scheduled:   { color: '#2563EB', label: 'Scheduled' },
  completed:   { color: '#6B7280', label: 'Completed' },
  cancelled:   { color: '#DC2626', label: 'Cancelled' },
  available:   { color: '#16A34A', label: 'Available' },
  unavailable: { color: '#DC2626', label: 'Not Available' },
  not_marked:  { color: '#6B7280', label: 'Not Marked' },
  verified:    { color: '#16A34A', label: 'Verified' },
  submitted:   { color: '#F59E0B', label: 'Under Review' },
  pending:     { color: '#DC2626', label: 'Due' },
  boarded:     { color: '#2563EB', label: 'Boarded' },
  confirmed:   { color: '#2563EB', label: 'Confirmed' },
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = STATUS_MAP[status] || { color: '#6B7280', label: 'Unknown' };

  const paddingH = size === 'sm' ? 8 : 12;
  const paddingV = size === 'sm' ? 3 : 5;
  const fontSize = size === 'sm' ? 11 : 13;

  return (
    <View
      style={[
        styles.badge,
        {
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
          backgroundColor: config.color + '20',
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { fontSize, color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  label: {
    fontWeight: '600',
  },
});

export default StatusBadge;
