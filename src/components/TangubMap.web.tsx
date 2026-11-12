import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { regionFor, TANGUB_BOUNDS } from '../data/tangub';
import { colors, radius } from '../theme';
import type { TangubMapProps } from './TangubMap';

const pinIcon = (emoji: string) =>
  L.divIcon({
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: `<div style="width:38px;height:38px;border-radius:19px;background:#fff;border:2px solid ${colors.primary};display:flex;align-items:center;justify-content:center;font-size:20px;box-sizing:border-box">${emoji}</div>`,
  });

/** Browser version of the map: Leaflet + OpenStreetMap, locked to the Tangub City area. */
export default function TangubMap({ pins, route, onPick, style }: TangubMapProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const line = useRef<L.Polyline | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  // Create the map once.
  useEffect(() => {
    if (!host.current) return;
    const bounds = L.latLngBounds(
      [TANGUB_BOUNDS.south, TANGUB_BOUNDS.west],
      [TANGUB_BOUNDS.north, TANGUB_BOUNDS.east],
    );
    const fixed = pins.filter((p) => p.id !== 'courier');
    const region = regionFor((fixed.length ? fixed : pins).map((p) => p.coords));
    const m = L.map(host.current, {
      maxBounds: bounds,
      maxBoundsViscosity: 1,
      minZoom: 11,
      attributionControl: true,
    }).fitBounds([
      [region.latitude - region.latitudeDelta / 2, region.longitude - region.longitudeDelta / 2],
      [region.latitude + region.latitudeDelta / 2, region.longitude + region.longitudeDelta / 2],
    ]);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(m);
    m.on('click', (e) => onPickRef.current?.({ latitude: e.latlng.lat, longitude: e.latlng.lng }));
    map.current = m;
    const markerStore = markers.current;
    return () => {
      m.remove();
      map.current = null;
      markerStore.clear();
      line.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep markers and the route in sync with props.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set<string>();
    for (const p of pins) {
      seen.add(p.id);
      const at: L.LatLngExpression = [p.coords.latitude, p.coords.longitude];
      const existing = markers.current.get(p.id);
      if (existing) existing.setLatLng(at);
      else {
        markers.current.set(
          p.id,
          L.marker(at, { icon: pinIcon(p.emoji), title: p.label, alt: p.label, zIndexOffset: p.id === 'courier' ? 1000 : 0 }).addTo(m),
        );
      }
    }
    for (const [id, marker] of markers.current) {
      if (!seen.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }
    line.current?.remove();
    line.current =
      route && route.length > 1
        ? L.polyline(route.map((c) => [c.latitude, c.longitude] as [number, number]), {
            color: colors.primary,
            weight: 4,
            dashArray: '2 8',
          }).addTo(m)
        : null;
  });

  return (
    <View style={[styles.wrap, style]}>
      <div ref={host} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 240, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#E9F1E4', zIndex: 0 },
});
