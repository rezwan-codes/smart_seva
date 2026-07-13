import { useEffect, useState } from "react";
import { authService } from "../services/authService";

type LocationPoint = {
  lat: number;
  lng: number;
};

type LiveLocationState = {
  location: LocationPoint | null;
  status: "idle" | "tracking" | "blocked" | "unavailable";
  error: string;
};

export function useLiveLocation(enabled = true) {
  const [state, setState] = useState<LiveLocationState>({
    location: null,
    status: "idle",
    error: "",
  });

  useEffect(() => {
    if (!enabled) return;

    if (!navigator.geolocation) {
      const timer = window.setTimeout(() => {
        setState((current) => ({
          ...current,
          status: "unavailable",
          error: "Location is not available on this device.",
        }));
      }, 0);

      return () => window.clearTimeout(timer);
    }

    let lastSentAt = 0;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setState({ location: nextLocation, status: "tracking", error: "" });

        const now = Date.now();
        if (now - lastSentAt > 25000) {
          lastSentAt = now;
          authService.updateLocation(nextLocation.lat, nextLocation.lng).catch(() => {});
        }
      },
      () => {
        setState((current) => ({
          ...current,
          status: "blocked",
          error: "Location permission is blocked.",
        }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return state;
}
