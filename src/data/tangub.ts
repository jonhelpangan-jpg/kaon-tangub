import bounds from '../../shared/tangub-bounds.json';
import { getRestaurant } from './restaurants';

export type Coords = { latitude: number; longitude: number };

/**
 * Kaon Tangub delivers inside Tangub City, Misamis Occidental only.
 *
 * NOTE: this is an approximate bounding box around the city, not the official
 * city boundary. Replace it with the real boundary polygon before launch.
 * The numbers live in shared/tangub-bounds.json so the server enforces the same area.
 */
export const TANGUB_BOUNDS: { south: number; north: number; west: number; east: number } = bounds;

/** Poblacion / city centre – used as the default map position and delivery pin. */
export const TANGUB_CENTER: Coords = { latitude: 8.0655, longitude: 123.7535 };

export const isInTangub = (c: Coords) =>
  c.latitude >= TANGUB_BOUNDS.south &&
  c.latitude <= TANGUB_BOUNDS.north &&
  c.longitude >= TANGUB_BOUNDS.west &&
  c.longitude <= TANGUB_BOUNDS.east;

export const OUTSIDE_TANGUB_MESSAGE =
  'That location is outside Tangub City. Kaon Tangub delivers within Tangub City only.';

export const restaurantCoords = (restaurantId: string): Coords =>
  getRestaurant(restaurantId)?.location ?? TANGUB_CENTER;

export const lerpCoords = (a: Coords, b: Coords, t: number): Coords => ({
  latitude: a.latitude + (b.latitude - a.latitude) * t,
  longitude: a.longitude + (b.longitude - a.longitude) * t,
});

/** A map region that fits the given points with some padding. */
export function regionFor(points: Coords[]) {
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.8, 0.012),
    longitudeDelta: Math.max((maxLng - minLng) * 1.8, 0.012),
  };
}
