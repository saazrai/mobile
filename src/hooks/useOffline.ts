import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

/** Hook to track network connectivity status. Returns true when offline. */
export function useOffline(): boolean {
  const [isOffline, setIsOffline] = useState<boolean>(true);

  useEffect(() => {
    // Initial check
    const checkConnection = async () => {
      try {
        const state = await NetInfo.fetch();
        setIsOffline(!state.isConnected);
      } catch (error) {
        console.error('Failed to check network status:', error);
        setIsOffline(true); // Assume offline on error for safety
      }
    };

    checkConnection();

    // Subscribe to connectivity changes
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      setIsOffline(!state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return isOffline;
}
