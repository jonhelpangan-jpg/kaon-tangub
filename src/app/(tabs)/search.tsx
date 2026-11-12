import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CartBar, EmptyState, RestaurantCard } from '../../components/ui';
import { MenuItem, Restaurant, restaurants } from '../../data/restaurants';
import { useApp } from '../../store/AppContext';
import { colors, money, radius } from '../../theme';

const suggestions = ['Pizza', 'Ramen', 'Tacos', 'Burger', 'Salad', 'Cake'];

export default function SearchScreen() {
  const { cartCount } = useApp();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const { places, dishes } = useMemo(() => {
    if (!q) return { places: [] as Restaurant[], dishes: [] as { r: Restaurant; item: MenuItem }[] };
    const places = restaurants.filter(
      (r) => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q),
    );
    const dishes = restaurants.flatMap((r) =>
      r.menu
        .flatMap((s) => s.items)
        .filter((i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
        .map((item) => ({ r, item })),
    );
    return { places, dishes };
  }, [q]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.inputWrap}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search restaurants or dishes"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <Pressable accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: cartCount ? 96 : 24 }}>
        {!q ? (
          <View>
            <Text style={styles.h2}>Popular searches</Text>
            <View style={styles.chips}>
              {suggestions.map((s) => (
                <Pressable key={s} style={styles.chip} onPress={() => setQuery(s)}>
                  <Text style={styles.chipText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : !places.length && !dishes.length ? (
          <EmptyState emoji="🔍" title={`No results for “${query.trim()}”`} subtitle="Check the spelling or try something else." />
        ) : (
          <View>
            {places.length ? <Text style={styles.h2}>Restaurants</Text> : null}
            {places.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
            {dishes.length ? <Text style={styles.h2}>Dishes</Text> : null}
            {dishes.map(({ r, item }) => (
              <Pressable key={item.id} style={styles.dish} onPress={() => router.push(`/restaurant/${r.id}`)}>
                <View style={[styles.dishIcon, { backgroundColor: r.tint }]}>
                  <Text style={{ fontSize: 26 }}>{item.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dishName}>{item.name}</Text>
                  <Text style={styles.dishMeta}>
                    {r.name} · {money(item.price)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <CartBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    marginBottom: 0,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 13 },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontWeight: '600', color: colors.text },
  dish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  dishIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dishName: { fontSize: 15, fontWeight: '700', color: colors.text },
  dishMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
