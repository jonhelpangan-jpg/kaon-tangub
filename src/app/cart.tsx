import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirm, EmptyState, PrimaryButton, QuantityStepper } from '../components/ui';
import { getRestaurant } from '../data/restaurants';
import { SERVICE_FEE_RATE, useApp } from '../store/AppContext';
import { colors, money, radius } from '../theme';

export default function CartScreen() {
  const { cart, cartRestaurantId, subtotal, addItem, decrementItem, clearCart } = useApp();
  const insets = useSafeAreaInsets();
  const restaurant = cartRestaurantId ? getRestaurant(cartRestaurantId) : undefined;

  if (!cart.length || !restaurant) {
    return (
      <View style={styles.screen}>
        <EmptyState emoji="🛒" title="Your cart is empty" subtitle="Add something tasty from a restaurant to get started." />
        <PrimaryButton label="Browse restaurants" onPress={() => router.dismissTo('/')} style={{ marginHorizontal: 32 }} />
      </View>
    );
  }

  const serviceFee = subtotal * SERVICE_FEE_RATE;
  const total = subtotal + restaurant.deliveryFee + serviceFee;
  const short = restaurant.minOrder - subtotal;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.headRow}>
          <Pressable style={{ flex: 1 }} onPress={() => router.push(`/restaurant/${restaurant.id}`)}>
            <Text style={styles.from}>Order from</Text>
            <Text style={styles.restaurant}>
              {restaurant.emoji} {restaurant.name}
            </Text>
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={() => confirm('Clear cart?', 'All items will be removed.', 'Clear', clearCart)}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          {cart.map((line, i) => (
            <View key={line.item.id} style={[styles.line, i > 0 && styles.lineBorder]}>
              <Text style={{ fontSize: 28 }}>{line.item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{line.item.name}</Text>
                <Text style={styles.itemPrice}>{money(line.item.price * line.qty)}</Text>
              </View>
              <QuantityStepper
                qty={line.qty}
                onAdd={() => addItem(restaurant.id, line.item)}
                onRemove={() => decrementItem(line.item.id)}
              />
            </View>
          ))}
        </View>

        <Pressable onPress={() => router.push(`/restaurant/${restaurant.id}`)} style={styles.addMore}>
          <Text style={styles.addMoreText}>+ Add more items</Text>
        </Pressable>

        <View style={styles.card}>
          <Row label="Subtotal" value={money(subtotal)} />
          <Row label="Delivery fee" value={restaurant.deliveryFee ? money(restaurant.deliveryFee) : 'Free'} />
          <Row label="Service fee (5%)" value={money(serviceFee)} />
          <View style={styles.divider} />
          <Row label="Total" value={money(total)} bold />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {short > 0 ? (
          <Text style={styles.minNote}>
            Add {money(short)} more to reach the {money(restaurant.minOrder)} minimum order.
          </Text>
        ) : null}
        <PrimaryButton
          label="Go to checkout"
          trailing={`· ${money(total)}`}
          disabled={short > 0}
          onPress={() => router.push('/checkout')}
        />
      </View>
    </View>
  );
}

export function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowText, bold && styles.rowBold]}>{label}</Text>
      <Text style={[styles.rowText, bold && styles.rowBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  headRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14 },
  from: { fontSize: 13, color: colors.muted },
  restaurant: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 2 },
  clear: { color: colors.primary, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  lineBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  itemName: { fontSize: 15, fontWeight: '700', color: colors.text },
  itemPrice: { fontSize: 14, color: colors.muted, marginTop: 2 },
  addMore: { paddingVertical: 16, alignItems: 'center' },
  addMoreText: { color: colors.primary, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowText: { fontSize: 15, color: colors.muted },
  rowBold: { fontSize: 17, fontWeight: '800', color: colors.text },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4 },
  footer: {
    padding: 16,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 10,
  },
  minNote: { textAlign: 'center', color: colors.primaryDark, fontSize: 13, fontWeight: '600' },
});
