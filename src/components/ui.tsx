import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Restaurant } from '../data/restaurants';
import { useApp } from '../store/AppContext';
import { colors, money, radius, shadow } from '../theme';

/** Cross-platform confirm dialog (Alert has no buttons on web). */
export function confirm(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

export function PrimaryButton({
  label,
  trailing,
  onPress,
  disabled,
  style,
}: {
  label: string;
  trailing?: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryBtn,
        disabled && { backgroundColor: '#D8D2CA' },
        pressed && { backgroundColor: colors.primaryDark },
        style,
      ]}>
      <Text style={styles.primaryBtnText}>{label}</Text>
      {trailing ? <Text style={styles.primaryBtnText}>{trailing}</Text> : null}
    </Pressable>
  );
}

export function QuantityStepper({
  qty,
  onAdd,
  onRemove,
}: {
  qty: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  if (qty === 0) {
    return (
      <Pressable accessibilityLabel="Add to cart" onPress={onAdd} hitSlop={8} style={styles.addBtn}>
        <Ionicons name="add" size={20} color="#fff" />
      </Pressable>
    );
  }
  return (
    <View style={styles.stepper}>
      <Pressable accessibilityLabel="Remove one" onPress={onRemove} hitSlop={8} style={styles.stepBtn}>
        <Ionicons name={qty === 1 ? 'trash-outline' : 'remove'} size={16} color={colors.primary} />
      </Pressable>
      <Text style={styles.stepQty}>{qty}</Text>
      <Pressable accessibilityLabel="Add one" onPress={onAdd} hitSlop={8} style={styles.stepBtn}>
        <Ionicons name="add" size={16} color={colors.primary} />
      </Pressable>
    </View>
  );
}

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const { favorites, toggleFavorite } = useApp();
  const fav = favorites.includes(restaurant.id);
  return (
    <Pressable
      onPress={() => router.push(`/restaurant/${restaurant.id}`)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={[styles.cardHero, { backgroundColor: restaurant.tint }]}>
        <Text style={styles.cardEmoji}>{restaurant.emoji}</Text>
        <View style={styles.badges}>
          {restaurant.featured ? (
            <View style={[styles.promo, styles.featured]}>
              <Text style={[styles.promoText, { color: '#fff' }]}>★ Featured</Text>
            </View>
          ) : null}
          {restaurant.promo ? (
            <View style={styles.promo}>
              <Text style={styles.promoText}>{restaurant.promo}</Text>
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityLabel={fav ? 'Remove from favorites' : 'Add to favorites'}
          onPress={() => toggleFavorite(restaurant.id)}
          hitSlop={8}
          style={styles.favBtn}>
          <Ionicons name={fav ? 'heart' : 'heart-outline'} size={18} color={fav ? colors.primary : colors.text} />
        </Pressable>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <View style={styles.rating}>
            <Ionicons name="star" size={12} color={colors.star} />
            <Text style={styles.ratingText}>{restaurant.rating !== undefined ? restaurant.rating.toFixed(1) : 'New'}</Text>
          </View>
        </View>
        <Text style={styles.cardMeta}>
          {restaurant.cuisine} · {restaurant.etaMin}–{restaurant.etaMax} min ·{' '}
          {restaurant.deliveryFee === 0 ? 'Free delivery' : `${money(restaurant.deliveryFee)} delivery`}
        </Text>
      </View>
    </Pressable>
  );
}

/** Floating "View cart" bar shown when the cart has items. */
export function CartBar({ bottomOffset = 0 }: { bottomOffset?: number }) {
  const { cartCount, subtotal } = useApp();
  const insets = useSafeAreaInsets();
  if (!cartCount) return null;
  return (
    <View style={[styles.cartBarWrap, { bottom: bottomOffset + Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <Pressable onPress={() => router.push('/cart')} style={styles.cartBar}>
        <View style={styles.cartBadge}>
          <Text style={styles.cartBadgeText}>{cartCount}</Text>
        </View>
        <Text style={styles.cartBarText}>View cart</Text>
        <Text style={styles.cartBarText}>{money(subtotal)}</Text>
      </Pressable>
    </View>
  );
}

export function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 56 }}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    padding: 3,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQty: { minWidth: 26, textAlign: 'center', fontWeight: '700', color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: 16, ...shadow },
  cardHero: {
    height: 130,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: { fontSize: 64 },
  badges: { position: 'absolute', left: 12, top: 12, right: 56, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  featured: { backgroundColor: colors.primary },
  promo: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  promoText: { color: colors.accentText, fontSize: 12, fontWeight: '800' },
  favBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: 14, gap: 4 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text, flexShrink: 1 },
  cardMeta: { fontSize: 13, color: colors.muted },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ratingText: { fontSize: 12, fontWeight: '700', color: colors.text },
  cartBarWrap: { position: 'absolute', left: 16, right: 16 },
  cartBar: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow,
    shadowOpacity: 0.2,
  },
  cartBarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cartBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cartBadgeText: { color: colors.accentText, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: 14, color: colors.muted, textAlign: 'center' },
});
