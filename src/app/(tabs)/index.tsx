import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CartBar, EmptyState, RestaurantCard } from '../../components/ui';
import { categories, restaurants } from '../../data/restaurants';
import { useApp } from '../../store/AppContext';
import { colors, radius } from '../../theme';

type Sort = 'recommended' | 'fastest' | 'rating';
const sorts: { id: Sort; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'fastest', label: 'Fastest' },
  { id: 'rating', label: 'Top rated' },
];

export default function HomeScreen() {
  const { address, cartCount } = useApp();
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<Sort>('recommended');

  const list = useMemo(() => {
    const filtered = restaurants.filter((r) => category === 'all' || r.categories.includes(category));
    if (sort === 'fastest') return [...filtered].sort((a, b) => a.etaMin - b.etaMin);
    if (sort === 'rating') return [...filtered].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return filtered;
  }, [category, sort]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <RestaurantCard restaurant={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: cartCount ? 96 : 24 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState emoji="🍽️" title="Nothing here yet" subtitle="Try a different category." />
        }
        ListHeaderComponent={
          <View>
            <Pressable style={styles.addressRow} onPress={() => router.push('/profile')}>
              <Image source={require('../../../assets/logo.png')} style={styles.logo} accessibilityLabel="Kaon Tangub" />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="location" size={12} color={colors.primary} />
                  <Text style={styles.addressLabel}>Deliver to</Text>
                </View>
                <Text style={styles.address} numberOfLines={1}>
                  {address}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={colors.muted} />
            </Pressable>

            <Text style={styles.h1}>
              Kaon ta! <Text style={{ color: colors.primary }}>What are you craving?</Text>
            </Text>

            <Pressable style={styles.search} onPress={() => router.push('/search')}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <Text style={styles.searchText}>Search restaurants or dishes</Text>
            </Pressable>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.bleed}
              contentContainerStyle={styles.catRow}>
              {categories.map((c) => {
                const active = c.id === category;
                return (
                  <Pressable key={c.id} onPress={() => setCategory(c.id)} style={styles.cat}>
                    <View style={[styles.catIcon, active && styles.catIconActive]}>
                      <Text style={{ fontSize: 26 }}>{c.emoji}</Text>
                    </View>
                    <Text style={[styles.catLabel, active && { color: colors.primary }]}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.sortRow}>
              {sorts.map((s) => {
                const active = s.id === sort;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setSort(s.id)}
                    style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && { color: '#fff' }]}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.h2}>
              {list.length} {list.length === 1 ? 'restaurant' : 'restaurants'} near you
            </Text>
          </View>
        }
      />
      <CartBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  logo: { width: 44, height: 44, borderRadius: 11 },
  addressLabel: { fontSize: 12, color: colors.muted },
  address: { fontSize: 15, fontWeight: '700', color: colors.text },
  h1: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 14 },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  searchText: { color: colors.muted, fontSize: 15 },
  bleed: { marginHorizontal: -16 },
  catRow: { paddingHorizontal: 16, paddingVertical: 16, gap: 14 },
  cat: { alignItems: 'center', gap: 6 },
  catIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIconActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  catLabel: { fontSize: 12, fontWeight: '600', color: colors.muted },
  sortRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
});
