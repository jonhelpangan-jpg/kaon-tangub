import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { restaurants } from '../../data/restaurants';
import { useApp } from '../../store/AppContext';
import { colors, money, radius } from '../../theme';

export default function ProfileScreen() {
  const { name, setName, address, setAddress, favorites, orders } = useApp();
  const favs = restaurants.filter((r) => favorites.includes(r.id));
  const spent = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Profile</Text>

        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(name.trim()[0] ?? 'G').toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{name.trim() || 'Guest'}</Text>
            <Text style={styles.meta}>
              {orders.length} {orders.length === 1 ? 'order' : 'orders'} · {money(spent)} spent
            </Text>
          </View>
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text style={styles.label}>Delivery address</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Street, apartment, city"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Pressable style={styles.rider} onPress={() => router.push('/rider')}>
          <Text style={{ fontSize: 26 }}>🛵</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.riderTitle}>Rider mode</Text>
            <Text style={styles.meta}>Accept deliveries and share your live location</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <Text style={styles.h2}>Favorites</Text>
        {favs.length ? (
          favs.map((r) => (
            <Pressable key={r.id} style={styles.fav} onPress={() => router.push(`/restaurant/${r.id}`)}>
              <View style={[styles.favIcon, { backgroundColor: r.tint }]}>
                <Text style={{ fontSize: 24 }}>{r.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.favName}>{r.name}</Text>
                <Text style={styles.meta}>{r.cuisine}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))
        ) : (
          <Text style={styles.meta}>Tap the heart on a restaurant to save it here.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  h1: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 16 },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 28, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 18, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
  },
  rider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 24,
  },
  riderTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  fav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  favIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  favName: { fontSize: 15, fontWeight: '700', color: colors.text },
});
