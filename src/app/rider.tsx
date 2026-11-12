import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api, Order, RiderOrders } from '../api';
import TangubMap from '../components/TangubMap';
import { EmptyState, PrimaryButton } from '../components/ui';
import { getRestaurant } from '../data/restaurants';
import { Coords, isInTangub } from '../data/tangub';
import { useApp } from '../store/AppContext';
import { colors, money, radius, shadow } from '../theme';

const POLL_MS = 4000;
const SEND_MS = 3000;

/**
 * Rider mode: accept orders, share live GPS while delivering, mark picked up / delivered.
 * GPS is shared only while this screen is open (no background tracking yet).
 */
export default function RiderScreen() {
  const { deviceId, name, ready } = useApp();
  const [data, setData] = useState<RiderOrders | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gps, setGps] = useState<{ coords: Coords | null; message: string }>({ coords: null, message: 'GPS off' });

  const load = useCallback(async () => {
    if (!deviceId) return;
    try {
      setData(await api.riderOrders(deviceId));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [deviceId]);

  useEffect(() => {
    if (!ready) return;
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [ready, load]);

  const active = data?.active[0];
  const activeId = active?.id;
  const latest = useRef<Coords | null>(null);

  // While an order is in progress, watch this phone's GPS and send it to the server.
  useEffect(() => {
    if (!activeId || !deviceId) {
      setGps({ coords: null, message: 'GPS off' });
      return;
    }
    let sub: Location.LocationSubscription | null = null;
    let stopped = false;

    (async () => {
      setGps({ coords: null, message: 'Starting GPS…' });
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setGps({ coords: null, message: 'Location permission denied. The customer cannot see you on the map.' });
          return;
        }
        const s = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
          (pos) => {
            const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            if (!isInTangub(coords)) {
              latest.current = null;
              setGps({ coords: null, message: 'You are outside Tangub City. Your location is not being shared.' });
              return;
            }
            const first = !latest.current;
            latest.current = coords;
            setGps({ coords, message: 'Sharing your live location with the customer' });
            if (first) api.sendLocation(activeId, deviceId, coords).catch(() => {});
          },
          (reason) => setGps({ coords: null, message: `GPS error: ${reason}` }),
        );
        if (stopped) s.remove();
        else sub = s;
      } catch {
        setGps({ coords: null, message: 'Could not start GPS on this device.' });
      }
    })();

    // Send the most recent position every few seconds, even when standing still,
    // so the customer always sees a fresh location.
    const beat = setInterval(() => {
      if (latest.current) api.sendLocation(activeId, deviceId, latest.current).catch(() => {});
    }, SEND_MS);

    return () => {
      stopped = true;
      sub?.remove();
      clearInterval(beat);
      latest.current = null;
    };
  }, [activeId, deviceId]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
    await load();
    setBusy(false);
  };

  if (!data) {
    return <EmptyState emoji={error ? '⚠️' : '⏳'} title={error ? 'Cannot load orders' : 'Loading…'} subtitle={error ?? ''} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.sub}>Riding as {name.trim() || 'Guest'} · change your name in Profile</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {active ? (
        <ActiveDelivery
          order={active}
          gps={gps}
          busy={busy}
          onNext={() =>
            run(() => api.setStatus(active.id, deviceId, active.status === 'accepted' ? 'picked_up' : 'delivered'))
          }
        />
      ) : (
        <>
          <Text style={styles.h2}>Available orders</Text>
          {data.available.length ? (
            data.available.map((o) => (
              <View key={o.id} style={styles.card}>
                <OrderSummary order={o} />
                <PrimaryButton
                  label="Accept delivery"
                  disabled={busy}
                  onPress={() => run(() => api.acceptOrder(o.id, deviceId, name.trim() || 'Rider'))}
                />
              </View>
            ))
          ) : (
            <EmptyState emoji="🛵" title="No orders waiting" subtitle="New orders appear here automatically." />
          )}
        </>
      )}

      {data.completed.length ? (
        <>
          <Text style={styles.h2}>Delivered by you</Text>
          {data.completed.map((o) => (
            <View key={o.id} style={[styles.card, { gap: 2 }]}>
              <Text style={styles.name}>
                {o.restaurantName} → {o.customerName}
              </Text>
              <Text style={styles.meta}>
                #{o.id} · {money(o.total)} · tip {money(o.tip)}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

function OrderSummary({ order }: { order: Order }) {
  const r = getRestaurant(order.restaurantId);
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: r?.tint ?? colors.border }]}>
          <Text style={{ fontSize: 24 }}>{r?.emoji ?? '🍽️'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{order.restaurantName}</Text>
          <Text style={styles.meta}>
            #{order.id} · {order.lines.reduce((n, l) => n + l.qty, 0)} items · {money(order.total)}
          </Text>
        </View>
      </View>
      <Line icon="person-outline" text={order.customerName} />
      <Line icon="location-outline" text={order.address} />
      <Line icon="card-outline" text={order.payment} />
      {order.note ? <Line icon="chatbubble-outline" text={order.note} /> : null}
      <Text style={styles.items}>{order.lines.map((l) => `${l.qty}× ${l.item.name}`).join(', ')}</Text>
    </View>
  );
}

function ActiveDelivery({
  order,
  gps,
  busy,
  onNext,
}: {
  order: Order;
  gps: { coords: Coords | null; message: string };
  busy: boolean;
  onNext: () => void;
}) {
  const r = getRestaurant(order.restaurantId);
  const toRestaurant = order.status === 'accepted';
  const target = toRestaurant ? order.restaurantCoords : order.deliveryCoords;

  const openDirections = () => {
    const q = `${target.latitude},${target.longitude}`;
    const url = Platform.OS === 'ios' ? `http://maps.apple.com/?daddr=${q}` : `https://www.google.com/maps/dir/?api=1&destination=${q}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <>
      <Text style={styles.h2}>{toRestaurant ? 'Go to the restaurant' : 'Deliver to the customer'}</Text>
      <View style={styles.gpsRow}>
        <View style={[styles.gpsDot, !gps.coords && { backgroundColor: colors.muted }]} />
        <Text style={styles.gpsText}>{gps.message}</Text>
      </View>
      <TangubMap
        style={{ marginBottom: 12 }}
        route={[order.restaurantCoords, order.deliveryCoords]}
        pins={[
          { id: 'restaurant', coords: order.restaurantCoords, emoji: r?.emoji ?? '🍽️', label: order.restaurantName },
          { id: 'home', coords: order.deliveryCoords, emoji: '📍', label: 'Customer' },
          ...(gps.coords ? [{ id: 'courier', coords: gps.coords, emoji: '🛵', label: 'You' }] : []),
        ]}
      />
      <View style={styles.card}>
        <OrderSummary order={order} />
        <Pressable onPress={openDirections} style={styles.dirBtn}>
          <Ionicons name="navigate-outline" size={16} color={colors.primary} />
          <Text style={styles.dirText}>Directions to {toRestaurant ? 'restaurant' : 'customer'}</Text>
        </Pressable>
        <PrimaryButton label={toRestaurant ? 'Mark as picked up' : 'Mark as delivered'} disabled={busy} onPress={onNext} />
      </View>
    </>
  );
}

function Line({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  sub: { fontSize: 13, color: colors.muted },
  error: { color: colors.primaryDark, fontWeight: '600', marginTop: 8 },
  h2: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 16, marginBottom: 10 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 12, gap: 12, ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  items: { fontSize: 13, color: colors.muted },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  gpsText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  dirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dirText: { color: colors.primary, fontWeight: '700' },
});
