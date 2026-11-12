import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isFinished, Order, statusLabel } from '../../api';
import { confirm, EmptyState, PrimaryButton } from '../../components/ui';
import { getRestaurant } from '../../data/restaurants';
import { useApp } from '../../store/AppContext';
import { useAuth } from '../../store/AuthContext';
import { colors, money, radius, shadow } from '../../theme';

export default function OrdersScreen() {
  const { orders, ordersError, refreshOrders, reorder, cartCount } = useApp();
  const { user } = useAuth();

  // Refresh when the tab opens, and keep refreshing while it is on screen.
  useFocusEffect(
    useCallback(() => {
      refreshOrders();
      const t = setInterval(refreshOrders, 5000);
      return () => clearInterval(t);
    }, [refreshOrders]),
  );

  const onReorder = (order: Order) => {
    const go = () => {
      reorder(order);
      router.push('/cart');
    };
    if (cartCount) confirm('Replace cart?', 'Your current cart will be replaced by this order.', 'Replace', go);
    else go();
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Text style={styles.h1}>Orders</Text>
        <EmptyState emoji="🧾" title="Sign in to see your orders" subtitle="Your orders and live tracking appear here." />
        <PrimaryButton label="Sign in with Google" onPress={() => router.push('/sign-in')} style={{ marginHorizontal: 32 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Text style={styles.h1}>Orders</Text>
      {ordersError ? <Text style={styles.error}>{ordersError}</Text> : null}
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        ListEmptyComponent={
          <EmptyState emoji="🧾" title="No orders yet" subtitle="When you place an order it will show up here." />
        }
        renderItem={({ item: order }) => {
          const finished = isFinished(order);
          const delivered = order.status === 'delivered';
          const r = getRestaurant(order.restaurantId);
          return (
            <Pressable style={styles.card} onPress={() => router.push(`/order/${order.id}`)}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: r?.tint ?? colors.border }]}>
                  <Text style={{ fontSize: 26 }}>{r?.emoji ?? '🍽️'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{order.restaurantName}</Text>
                  <Text style={styles.meta}>
                    {order.lines.reduce((n, l) => n + l.qty, 0)} items · {money(order.total)} ·{' '}
                    {new Date(order.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    delivered ? styles.badgeDone : finished ? styles.badgeCancelled : styles.badgeActive,
                  ]}>
                  <Text
                    style={[
                      styles.badgeText,
                      { color: delivered ? colors.success : finished ? colors.muted : colors.primary },
                    ]}>
                    {statusLabel(order)}
                  </Text>
                </View>
              </View>
              <Text style={styles.items} numberOfLines={1}>
                {order.lines.map((l) => `${l.qty}× ${l.item.name}`).join(', ')}
              </Text>
              <View style={styles.actions}>
                <Pressable style={styles.btn} onPress={() => router.push(`/order/${order.id}`)}>
                  <Text style={styles.btnText}>{finished ? 'View receipt' : 'Track order'}</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnFilled]} onPress={() => onReorder(order)}>
                  <Text style={[styles.btnText, { color: '#fff' }]}>Reorder</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  h1: { fontSize: 28, fontWeight: '800', color: colors.text, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  error: { color: colors.primaryDark, fontWeight: '600', paddingHorizontal: 16, paddingBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 14, gap: 10, ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  items: { fontSize: 13, color: colors.muted },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeDone: { backgroundColor: colors.successSoft },
  badgeActive: { backgroundColor: colors.primarySoft },
  badgeCancelled: { backgroundColor: colors.border },
  badgeText: { fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnText: { fontWeight: '700', color: colors.text },
});
