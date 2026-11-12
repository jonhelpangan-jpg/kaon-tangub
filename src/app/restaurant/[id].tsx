import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CartBar, confirm, EmptyState, QuantityStepper } from '../../components/ui';
import { getRestaurant, MenuItem } from '../../data/restaurants';
import { useApp } from '../../store/AppContext';
import { colors, money, radius } from '../../theme';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const restaurant = getRestaurant(id);
  const { addItem, replaceCartWith, decrementItem, qtyOf, cartCount, favorites, toggleFavorite } = useApp();

  if (!restaurant) {
    return <EmptyState emoji="🤷" title="Restaurant not found" subtitle="It may no longer be available." />;
  }

  const fav = favorites.includes(restaurant.id);

  const onAdd = (item: MenuItem) => {
    if (!addItem(restaurant.id, item)) {
      confirm(
        'Start a new cart?',
        `Your cart has items from another restaurant. Clear it and add ${item.name}?`,
        'New cart',
        () => replaceCartWith(restaurant.id, item),
      );
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: restaurant.name,
          headerRight: () => (
            <Pressable
              accessibilityLabel={fav ? 'Remove from favorites' : 'Add to favorites'}
              onPress={() => toggleFavorite(restaurant.id)}
              hitSlop={10}
              style={{ paddingHorizontal: 8 }}>
              <Ionicons name={fav ? 'heart' : 'heart-outline'} size={22} color={fav ? colors.primary : colors.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: cartCount ? 110 : 32 }}>
        <View style={[styles.hero, { backgroundColor: restaurant.tint }]}>
          <Text style={{ fontSize: 84 }}>{restaurant.emoji}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.title}>{restaurant.name}</Text>
          <Text style={styles.meta}>{restaurant.cuisine}</Text>
          <View style={styles.stats}>
            <Stat icon="star" tint={colors.star} value={restaurant.rating !== undefined ? restaurant.rating.toFixed(1) : 'New'}
              label={restaurant.reviews ? `${restaurant.reviews}+ ratings` : 'no ratings yet'} />
            <Stat icon="time-outline" value={`${restaurant.etaMin}–${restaurant.etaMax}`} label="minutes" />
            <Stat
              icon="bicycle-outline"
              value={restaurant.deliveryFee === 0 ? 'Free' : money(restaurant.deliveryFee)}
              label="delivery"
            />
          </View>
          {restaurant.promo ? (
            <View style={styles.promo}>
              <Ionicons name="pricetag" size={14} color={colors.primary} />
              <Text style={styles.promoText}>{restaurant.promo}</Text>
            </View>
          ) : null}
        </View>

        {restaurant.menu.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <View key={item.id} style={styles.item}>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.popular ? (
                      <View style={styles.popular}>
                        <Text style={styles.popularText}>Popular</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.itemDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <Text style={styles.itemPrice}>{money(item.price)}</Text>
                </View>
                <View style={styles.itemRight}>
                  <View style={[styles.itemIcon, { backgroundColor: restaurant.tint }]}>
                    <Text style={{ fontSize: 34 }}>{item.emoji}</Text>
                  </View>
                  <View style={styles.stepperPos}>
                    <QuantityStepper
                      qty={qtyOf(item.id)}
                      onAdd={() => onAdd(item)}
                      onRemove={() => decrementItem(item.id)}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
      <CartBar />
    </View>
  );
}

function Stat({
  icon,
  tint = colors.text,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint?: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name={icon} size={15} color={tint} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: { height: 170, alignItems: 'center', justifyContent: 'center' },
  info: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: -28,
    borderRadius: radius.lg,
    padding: 16,
    gap: 4,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  meta: { fontSize: 14, color: colors.muted },
  stats: { flexDirection: 'row', marginTop: 12 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.muted },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    padding: 10,
    marginTop: 12,
  },
  promoText: { color: colors.primaryDark, fontWeight: '600', fontSize: 13 },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: colors.text, marginBottom: 4 },
  item: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  itemName: { fontSize: 16, fontWeight: '700', color: colors.text },
  itemDesc: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },
  popular: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  popularText: { fontSize: 11, fontWeight: '700', color: colors.accentText },
  itemRight: { width: 92, alignItems: 'center', paddingBottom: 14 },
  itemIcon: { width: 84, height: 76, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  stepperPos: { position: 'absolute', bottom: 0, right: 0 },
});
