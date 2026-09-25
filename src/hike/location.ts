import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export type Fix = { lat: number; lng: number; alt: number };

const NATIVE = Capacitor.isNativePlatform();

function fromCoords(coords: GeolocationCoordinates | { latitude: number; longitude: number; altitude: number | null }): Fix {
  return {
    lat: coords.latitude,
    lng: coords.longitude,
    alt: coords.altitude ?? 0,
  };
}

/** Resolves the device's position once, or null when unavailable or denied. */
export async function getCurrentFix(): Promise<Fix | null> {
  try {
    if (NATIVE) {
      const perm = await Geolocation.requestPermissions();
      if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') return null;
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      return fromCoords(position.coords);
    }
    if (!('geolocation' in navigator)) return null;
    return await new Promise<Fix | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(fromCoords(position.coords)),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 }
      );
    });
  } catch {
    return null;
  }
}

/**
 * Streams position updates, dropping fixes less accurate than 30 m.
 * Returns a cleanup function; resolves to null if a watch could not be started.
 */
export async function watchFix(onFix: (fix: Fix) => void): Promise<(() => void) | null> {
  try {
    if (NATIVE) {
      const perm = await Geolocation.requestPermissions();
      if (perm.location !== 'granted') return null;
      const id = await Geolocation.watchPosition({ enableHighAccuracy: true }, (position, err) => {
        if (err || !position) return;
        if (position.coords.accuracy > 30) return;
        onFix(fromCoords(position.coords));
      });
      return () => {
        Geolocation.clearWatch({ id }).catch(() => {});
      };
    }
    if (!('geolocation' in navigator)) return null;
    const id = navigator.geolocation.watchPosition(
      (position) => {
        if (position.coords.accuracy > 30) return;
        onFix(fromCoords(position.coords));
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  } catch {
    return null;
  }
}
