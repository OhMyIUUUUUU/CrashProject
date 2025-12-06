import { useCallback, useEffect, useState } from 'react';
import {
    foregroundLocationService,
    LocationData,
    ServiceStatus,
} from './foregroundLocationService';

/**
 * React Hook for using the Foreground Location Service
 * 
 * Usage:
 * ```tsx
 * const { status, start, stop, lastLocation } = useForegroundLocationService();
 * ```
 */
export function useForegroundLocationService() {
  const [status, setStatus] = useState<ServiceStatus>(
    foregroundLocationService.getStatus()
  );
  const [lastLocation, setLastLocation] = useState<LocationData | null>(
    foregroundLocationService.getLastLocation()
  );

  // Initialize service on mount
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const initialized = await foregroundLocationService.initialize();
        if (isMounted && initialized) {
          setStatus(foregroundLocationService.getStatus());
        }
      } catch (error) {
        console.error('Failed to initialize foreground service:', error);
      }
    };

    initialize();

    // Subscribe to status changes
    const unsubscribeStatus = foregroundLocationService.subscribeToStatus((newStatus) => {
      if (isMounted) {
        setStatus(newStatus);
      }
    });

    // Subscribe to location updates
    const unsubscribeLocation = foregroundLocationService.subscribeToLocation((location) => {
      if (isMounted) {
        setLastLocation(location);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeStatus();
      unsubscribeLocation();
    };
  }, []);

  const start = useCallback(async () => {
    const success = await foregroundLocationService.start();
    if (success) {
      setStatus(foregroundLocationService.getStatus());
    }
    return success;
  }, []);

  const stop = useCallback(async () => {
    await foregroundLocationService.stop();
    setStatus(foregroundLocationService.getStatus());
    setLastLocation(null);
  }, []);

  return {
    status,
    lastLocation,
    start,
    stop,
    isRunning: status.isRunning,
    isOnline: status.isOnline,
    error: status.error,
  };
}

