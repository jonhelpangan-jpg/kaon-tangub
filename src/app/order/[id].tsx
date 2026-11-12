import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api, isFinished, Order, ORDER_STAGES, stageIndex } from '../../api';
import TangubMap from '../../components/TangubMap';
import { confirm, EmptyState, PrimaryButton } from '../../components/ui';
import { getRestaurant } from '../../data/restaurants';
import { useApp } from '../../store/AppContext';
import { colors, money, radius } from '../../theme';
import { Row } from '../cart';

const LAST = ORDER_STAGES.length - 1;
const POLL_MS = 3000;

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders, deviceId, refreshOrders } = useApp();
  const [order, setOrder] = useState<Order | undefined>(() => orders.find((o) => o.id === id));
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try {
      setOrder(await api.getOrder(id));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
    setNow(Date.now());
  }, [id]);

  const finished = order ? isFinished(order) : false;

  // Live updates: ask the server for the latest status and rider position every few seconds.
  useEffect(() => {
    load();
    if (finished) return;
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load, finished]);

  useEffect(() => {
    if (finished) refreshOrders();
  }, [finished, refreshOrders]);

  if (!order) {
    return error ? (
      <EmptyState emoji="🧾" title="Order not found" subtitle={error} />
    ) : (
      <EmptyState emoji="⏳" title="Loading order…" subtitle="" />
    );
  }

  const restaurant = getRestaurant(order.restaurantId);
  const cancelled = order.status === 'cancelled';
  const stage = stageIndex(order);
  const done = order.status === 'delivered';
  const riderActive = order.status === 'accepted' || order.status === 'picked_up';
  const gpsAge = order.courier ? Math.max(0, Math.round((now - order.courier.updatedAt) / 1000)) : null;

  const onCancel = () =>
    confirm('Cancel order?', 'No rider has accepted it yet, so you can still cancel.', 'Cancel order', async () => {
      try {
        setOrder(await api.cancelOrder(order.id, deviceId));
      } catch (e) {
        setError((e as Error).message);
        load();
      }
    });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={[styles.hero, done && { backgroundColor: colors.successSoft }]}>
        <Text style={{ fontSize: 56 }}>{cancelled ? '❌' : done ? '🎉' : ['🧾', '👩‍🍳', '🛵'][stage]}</Text>
        <Text style={styles.heroTitle}>{cancelled ? 'Order cancelled' : ORDER_STAGES[stage].label}</Text>
        <Text style={styles.heroSub}>
          {cancelled
            ? 'You cancelled this order.'
            : order.riderName && !done
              ? `${ORDER_STAGES[stage].detail} · Rider: ${order.riderName}`
              : ORDER_STAGES[stage].detail}
        </Text>
        {!cancelled ? (
          <View style={styles.track}>
            <View
              style={[
                styles.trackFill,
                { width: `${((stage + (done ? 0 : 0.5)) / LAST) * 100}%` },
                done && { backgroundColor: colors.success },
              ]}
            />
          </View>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!cancelled ? (
        <>
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, !riderActive && { backgroundColor: colors.muted }]} />
            <Text style={styles.liveText}>
              {done
                ? 'Delivery completed · Tangub City'
                : !riderActive
                  ? 'Live tracking starts when a rider accepts · Tangub City'
                  : gpsAge === null
                    ? 'Waiting for rider GPS · Tangub City'
                    : `Live rider GPS · updated ${gpsAge}s ago · Tangub City`}
            </Text>
          </View>
          <TangubMap
            style={{ marginBottom: 16 }}
            route={[order.restaurantCoords, order.deliveryCoords]}
            pins={[
              { id: 'restaurant', coords: order.restaurantCoords, emoji: restaurant?.emoji ?? '🍽️', label: order.restaurantName },
              { id: 'home', coords: order.deliveryCoords, emoji: '📍', label: 'Delivery location' },
              ...(riderActive && order.courier
                ? [{ id: 'courier', coords: order.courier, emoji: '🛵', label: 'Your rider' }]
                : []),
            ]}
          />

          <View style={styles.card}>
            {ORDER_STAGES.map((s, i) => {
              const reached = i <= stage;
              return (
                <View key={s.status} style={styles.step}>
                  <View style={styles.stepRail}>
                    <View style={[styles.dot, reached && styles.dotOn]}>
                      {reached ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                    </View>
                    {i < LAST ? <View style={[styles.rail, i < stage && styles.railOn]} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: i < LAST ? 18 : 0 }}>
                    <Text style={[styles.stepLabel, !reached && { color: colors.muted }]}>{s.label}</Text>
                    <Text style={styles.stepDetail}>{s.detail}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      {order.status === 'placed' ? (
        <Pressable onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel order</Text>
        </Pressable>
      ) : null}

      <Text style={styles.h2}>Delivery details</Text>
      <View style={[styles.card, { gap: 10 }]}>
        <Detail icon="storefront-outline" text={order.restaurantName} />
        <Detail icon="location-outline" text={order.address} />
        <Detail icon="card-outline" text={order.payment} />
        {order.riderName ? <Detail icon="bicycle-outline" text={`Rider: ${order.riderName}`} /> : null}
        {order.note ? <Detail icon="chatbubble-outline" text={order.note} /> : null}
      </View>

      <Text style={styles.h2}>Order #{order.id}</Text>
      <View style={[styles.card, { paddingVertical: 6 }]}>
        {order.lines.map((l) => (
          <Row key={l.item.id} label={`${l.qty}× ${l.item.name}`} value={money(l.item.price * l.qty)} />
        ))}
        <View style={styles.divider} />
        <Row label="Subtotal" value={money(order.subtotal)} />
        <Row label="Delivery fee" value={order.deliveryFee ? money(order.deliveryFee) : 'Free'} />
        <Row label="Service fee" value={money(order.serviceFee)} />
        <Row label="Tip" value={money(order.tip)} />
        <View style={styles.divider} />
        <Row label="Total" value={money(order.total)} bold />
      </View>

      <PrimaryButton label="Back to home" onPress={() => router.dismissTo('/')} style={{ marginTop: 20 }} />
    </ScrollView>
  );
}

function Detail({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  heroSub: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  track: {
    alignSelf: 'stretch',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginTop: 14,
    overflow: 'hidden',
  },
  trackFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  error: { color: colors.primaryDark, fontWeight: '600', marginBottom: 12 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  liveText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14 },
  h2: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 20, marginBottom: 10 },
  step: { flexDirection: 'row', gap: 12 },
  stepRail: { alignItems: 'center', width: 22 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: colors.success, borderColor: colors.success },
  rail: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  railOn: { backgroundColor: colors.success },
  stepLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  stepDetail: { fontSize: 13, color: colors.muted, marginTop: 1 },
  cancelBtn: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cancelText: { color: colors.primaryDark, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4 },
});
