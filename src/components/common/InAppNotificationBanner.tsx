import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Text, Animated, Dimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../constants/theme";

interface InAppNotificationBannerProps {
  notification: {
    request: {
      content: {
        title: string;
        body: string;
      };
    };
  } | null;
  onDismiss: () => void;
}

const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = ({
  notification,
  onDismiss,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (notification) {
      // Slide down
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        // Slide up
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onDismiss();
        });
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss, translateY]);

  if (!notification) return null;

  const { title, body } = notification.request.content;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="bell-ring"
            color={COLORS.accent}
            size={22}
          />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <Text style={styles.body} numberOfLines={2}>
            {body}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50, // Floating slightly below the top
    left: 12,
    right: 12,
    zIndex: 9999,
    backgroundColor: "#1E293B", // Deep Slate / Dark Theme
    padding: 16,
    borderRadius: 16,
    // Strong shadow for "Floating" effect
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  title: {
    color: "#F8FAFC",
    fontWeight: "700",
    fontSize: 15,
  },
  body: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 18,
  },
});

export default InAppNotificationBanner;
