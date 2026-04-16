import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { COLORS } from '@constants/theme';
import { getInitials } from '@utils/formatters';

interface AvatarProps {
  imageUrl?: string;
  name: string;
  size?: number;
  onPress?: () => void;
}

const Avatar: React.FC<AvatarProps> = ({
  imageUrl,
  name,
  size = 40,
  onPress,
}) => {
  const [showFallback, setShowFallback] = useState(false);

  const radius = size / 2;
  const fontSize = size * 0.35;

  const content =
    imageUrl && !showFallback ? (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { width: size, height: size, borderRadius: radius }]}
        resizeMode="cover"
        onError={() => setShowFallback(true)}
      />
    ) : (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, borderRadius: radius, backgroundColor: COLORS.primary },
        ]}
      >
        <Text style={[styles.initials, { fontSize, color: 'white' }]}>
          {getInitials(name)}
        </Text>
      </View>
    );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View>{content}</View>;
};

const styles = StyleSheet.create({
  image: {},
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: '700',
  },
});

export default Avatar;
