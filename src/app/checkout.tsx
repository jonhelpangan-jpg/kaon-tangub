import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TangubMap from '../components/TangubMap';
import { PrimaryButton } from '../components/ui';
import { getRestaurant } from '../data/restaurants';
import { Coords, isInTangub, OUTSIDE_TANGUB_MESSAGE, restaurantCoords } from '../data/tangub';
import { SERVICE_FEE_RATE, useApp } from '../store/AppContext';
import { colors, money, radius } from '../theme';
import { Row } from './cart';

const tipOptions = [0, 20, 30, 50];
const payments: { id: string; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'Card •••• 4242', label: 'Card •••• 4242', icon: 'card-outline' },
  { id: 'Apple / Google Pay', label: 'Apple / Google Pay', icon: 'phone-portrait-outline' },
  { id: 'Cash on delivery', label: 'Cash on delivery', icon: 'cash-outline' },
];

export default function CheckoutScreen() {
  const { cart, cartRestaurantId, subtotal, address, setAddress, deliveryCoords, setDeliveryCoords, placeOrder } =
    useApp();
  const insets = useSafeAreaInsets();
  const [tip, setTip] = useState(20);
  const [payment, setPayment] = useState(payments[0].id);
  const [note, setNote] = useState('');
  const [placed, setPlaced] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [pinMessage, setPinMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const restaurant = cartRestaurantId ? getRestaurant(cartRestaurantId) : undefined;
  if (!restaurant || !cart.length) {
    // After placing an order the cart empties; navigation is already underway.
    return placed ? null : <Redirect href="/cart" />;
  }

  const serviceFee = subtotal * SERVICE_FEE_RATE;
  const total = subtotal + restaurant.deliveryFee + serviceFee + tip;
  const canPlace = address.trim().length > 0 && isInTangub(deliveryCoords);

  const movePin = (coords: Coords, okText: string) => {
    setPinMessage(setDeliveryCoords(coords) ? { ok: true, text: okText } : { ok: false, text: OUTSIDE_TANGUB_MESSAGE });
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPinMessage({ ok: false, text: 'Location permission was not granted. Tap the map to set your pin instead.' });
        return;
      }
      // Always ask for a fresh fix; the browser build would otherwise reuse a cached position.
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        ...(Platform.OS === 'web' ? { maximumAge: 0 } : null),
      } as Location.LocationOptions);
      movePin(pos.coords, 'Delivery pin set to your current location.');
    } catch {
      setPinMessage({ ok: false, text: 'Could not get your location. Tap the map to set your pin instead.' });
    } finally {
      setLocating(false);
    }
  };

  const onPlace = async () => {
    setPlacing(true);
    setOrderError(null);
    try {
      setPlaced(true);
      const order = await placeOrder({ tip, payment, note: note.trim() });
      router.dismissTo('/');
      router.push(`/order/${order.id}`);
    } catch (e) {
      setPlaced(false);
      setOrderError((e as Error).message);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.h2}>Delivery address</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="location-outline" size={18} color={colors.primary} />
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Street, apartment, city"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note for the courier (optional)"
          placeholderTextColor={colors.muted}
          style={[styles.inputWrap, styles.note]}
          multiline
        />
        <Text style={styles.h2}>Delivery pin</Text>
        <TangubMap
          pins={[
            { id: 'restaurant', coords: restaurantCoords(restaurant.id), emoji: restaurant.emoji, label: restaurant.name },
            { id: 'home', coords: deliveryCoords, emoji: '📍', label: 'Delivery location' },
          ]}
          onPick={(c) => movePin(c, 'Delivery pin moved.')}
        />
        <Pressable onPress={useMyLocation} disabled={locating} style={styles.locBtn}>
          <Ionicons name="navigate" size={16} color={colors.primary} />
          <Text style={styles.locBtnText}>{locating ? 'Finding you…' : 'Use my current location'}</Text>
        </Pressable>
        <Text style={[styles.hint, pinMessage && { color: pinMessage.ok ? colors.success : colors.primaryDark, fontWeight: '600' }]}>
          {pinMessage ? pinMessage.text : 'Tap the map to move the pin. We deliver within Tangub City only.'}
        </Text>
        <Text style={styles.eta}>
          Estimated arrival: {restaurant.etaMin}–{restaurant.etaMax} min
        </Text>

        <Text style={styles.h2}>Payment</Text>
        <View style={styles.card}>
          {payments.map((p, i) => (
            <Pressable key={p.id} onPress={() => setPayment(p.id)} style={[styles.payRow, i > 0 && styles.borderTop]}>
              <Ionicons name={p.icon} size={20} color={colors.text} />
              <Text style={styles.payLabel}>{p.label}</Text>
              <Ionicons
                name={payment === p.id ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={payment === p.id ? colors.primary : colors.muted}
              />
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>Trial version — no real payment is taken.</Text>

        <Text style={styles.h2}>Tip your courier</Text>
        <View style={styles.tips}>
          {tipOptions.map((t) => (
            <Pressable key={t} onPress={() => setTip(t)} style={[styles.tip, tip === t && styles.tipActive]}>
              <Text style={[styles.tipText, tip === t && { color: '#fff' }]}>{t === 0 ? 'None' : `₱${t}`}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.h2}>Summary</Text>
        <View style={[styles.card, { paddingVertical: 6 }]}>
          {cart.map((l) => (
            <Row key={l.item.id} label={`${l.qty}× ${l.item.name}`} value={money(l.item.price * l.qty)} />
          ))}
          <View style={styles.divider} />
          <Row label="Subtotal" value={money(subtotal)} />
          <Row label="Delivery fee" value={restaurant.deliveryFee ? money(restaurant.deliveryFee) : 'Free'} />
          <Row label="Service fee (5%)" value={money(serviceFee)} />
          <Row label="Tip" value={money(tip)} />
          <View style={styles.divider} />
          <Row label="Total" value={money(total)} bold />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {orderError ? <Text style={styles.orderError}>{orderError}</Text> : null}
        <PrimaryButton
          label={placing ? 'Placing order…' : 'Place order'}
          trailing={placing ? undefined : `· ${money(total)}`}
          disabled={!canPlace || placing}
          onPress={onPlace}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  h2: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 18, marginBottom: 10 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 13 },
  note: { marginTop: 10, minHeight: 64, paddingVertical: 12, fontSize: 15, color: colors.text, textAlignVertical: 'top' },
  locBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  locBtnText: { color: colors.primary, fontWeight: '700' },
  orderError: { color: colors.primaryDark, fontWeight: '600', textAlign: 'center', marginBottom: 10 },
  eta: { fontSize: 13, color: colors.muted, marginTop: 8 },
  hint: { fontSize: 12, color: colors.muted, marginTop: 8 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 14 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  payLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  borderTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  tips: { flexDirection: 'row', gap: 10 },
  tip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tipText: { fontWeight: '700', color: colors.text },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4 },
  footer: {
    padding: 16,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
