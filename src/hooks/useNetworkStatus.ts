import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { APP_STRINGS } from '@constants/strings';

/**
 * Hook that monitors network connectivity and alerts the user when disconnected.
 * Only shows the disconnection alert once per disconnection event.
 */
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const hasShownDisconnectAlert = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected === false && !hasShownDisconnectAlert.current) {
        Alert.alert(APP_STRINGS.NO_INTERNET, APP_STRINGS.NO_INTERNET_MESSAGE);
        hasShownDisconnectAlert.current = true;
      }

      if (state.isConnected === true && hasShownDisconnectAlert.current) {
        hasShownDisconnectAlert.current = false;
        // Optionally show a brief toast here in the future
      }

      setIsConnected(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  return { isConnected };
}
