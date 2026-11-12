import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { Coords, regionFor, TANGUB_BOUNDS } from '../data/tangub';
import { colors, radius } from '../theme';

export type MapPin = { id: string; coords: Coords; emoji: string; label: string };

export type TangubMapProps = {
  pins: MapPin[];
  /** Straight line drawn between these points (restaurant → customer). */
  route?: Coords[];
  /** Called when the user taps the map (used to move the delivery pin). */
  onPick?: (coords: Coords) => void;
  style?: ViewStyle;
};

/** Native map (iOS: Apple Maps, Android: Google Maps), locked to the Tangub City area. */
export default function TangubMap({ pins, route, onPick, style }: TangubMapProps) {
  const ref = useRef<MapView>(null);
  // Fit to the fixed points only so the map doesn't jump while the courier moves.
  const fixed = pins.filter((p) => p.id !== 'courier');
  const region = regionFor(fixed.length ? fixed.map((p) => p.coords) : pins.map((p) => p.coords));

  useEffect(() => {
    // Android / Google Maps: stop the map from being panned outside Tangub City.
    ref.current?.setMapBoundaries(
      { latitude: TANGUB_BOUNDS.north, longitude: TANGUB_BOUNDS.east },
      { latitude: TANGUB_BOUNDS.south, longitude: TANGUB_BOUNDS.west },
    );
  }, []);

  return (
    <View style={[styles.wrap, style]}>
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        minZoomLevel={11}
        onPress={onPick ? (e) => onPick(e.nativeEvent.coordinate) : undefined}
        toolbarEnabled={false}>
        {route && route.length > 1 ? (
          <Polyline coordinates={route} strokeColor={colors.primary} strokeWidth={4} />
        ) : null}
        {pins.map((p) => (
          <Marker key={p.id} coordinate={p.coords} title={p.label} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.pin}>
              <Text style={styles.pinEmoji}>{p.emoji}</Text>
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 220, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.border },
  pin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinEmoji: { fontSize: 20 },
});
