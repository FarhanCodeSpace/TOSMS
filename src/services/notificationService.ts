import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { COLLECTIONS } from "../config/firebaseCollections";

// Lazy-load notifications to avoid crashes on unsupported environments
let Notifications: any = null;
try {
  Notifications = require("expo-notifications");
} catch (e) {
  console.warn("Failed to load expo-notifications:", e);
}

/**
 * Helper to check if push notifications are supported in the current environment.
 */
export function arePushNotificationsSupported(): boolean {
  if (!Notifications) return false;

  // Check if running in Expo Go on Android (SDK 53+ doesn't support remote notifications)
  if (Platform.OS === "android") {
    if (
      Constants.executionEnvironment === "storeClient" || 
      Constants.appOwnership === "expo"
    ) {
      return false;
    }

    // Double check if the native module is available
    try {
      // Accessing a method should be safe if we're just checking for its existence
      // but in some cases, even the property access triggers the error.
      // So we use a try-catch.
      if (!Notifications.getPermissionsAsync) {
        return false;
      }
    } catch (e) {
      return false;
    }
  }
  return true;
}

/**
 * Register the device for push notifications and save the token to Firestore.
 */
export async function registerForPushNotifications(
  uid: string,
): Promise<string | undefined> {
  // Check if supported
  if (!arePushNotificationsSupported()) {
    console.warn(
      "Push notifications are not supported in Expo Go on Android (SDK 53+). Please use a Development Build.",
    );
    return;
  }

  if (!Device.isDevice) {
    console.warn("Must use physical device for Push Notifications");
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Failed to get push token for push notification!");
    return;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn("EAS project ID not found in Constants.expoConfig");
    return;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
      .data;

    // Save token to Firestore
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(userRef, {
      expoPushToken: token,
    });

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    return token;
  } catch (error) {
    console.error("Error registering for push notifications:", error);
    return;
  }
}

/**
 * Set up listeners for notification events.
 */
export function setupNotificationListeners(
  navigationRef: any,
  setNotification: (notification: any) => void,
) {
  // Check if supported
  if (!arePushNotificationsSupported()) {
    return () => {};
  }

  // Listener for when a notification is received while the app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(
    (notification) => {
      setNotification(notification);
    },
  );

  // Listener for when a user interacts with a notification
  const responseListener =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const type = data?.type;

      if (!type) return;

      switch (type) {
        case "availability_reminder":
          if (data.role === "driver") {
            navigationRef.navigate("DriverHome", { screen: "DriverAvailability" });
          } else {
            navigationRef.navigate("StudentHome", { screen: "StudentAvailability" });
          }
          break;
        case "fee_reminder":
          navigationRef.navigate("StudentHome", { screen: "FeePayment" });
          break;
        case "route_assigned":
          if (data.role === "driver") {
            navigationRef.navigate("MyRouteTab");
          } else {
            navigationRef.navigate("MyRouteTab");
          }
          break;
        case "ride_started":
          navigationRef.navigate("RidesTab", { 
            screen: "TrackRide", 
            params: { rideId: data.rideId } 
          });
          break;
        case "payment_verified":
          navigationRef.navigate("StudentHome", { screen: "PaymentHistory" });
          break;
        default:
          console.warn("Unknown notification type:", type);
      }
    });

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}
