import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { restaurants } from '../../data/restaurants';
import { PrimaryButton } from '../../components/ui';
import { useApp } from '../../store/AppContext';
import { useAuth } from '../../store/AuthContext';
import { colors, money, radius } from '../../theme';

export default function ProfileScreen() {
  const { address, setAddress, favorites, orders } = useApp();
  const { user, signOut } = useAuth();
  const riderStatus = user?.rider?.status;
  const favs = restaurants.filter((r) => favorites.includes(r.id));
  const spent = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Profile</Text>

        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name[0] ?? '?').toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user ? user.name : 'Not signed in'}</Text>
            <Text style={styles.meta}>
              {user
                ? `${user.email} · ${orders.length} ${orders.length === 1 ? 'order' : 'orders'} · ${money(spent)} spent`
                : 'Sign in to order and track deliveries'}
            </Text>
          </View>
        </View>

        {user ? null : (
          <PrimaryButton label="Sign in with Google" onPress={() => router.push('/sign-in')} style={{ marginTop: 12 }} />
        )}

        <Text style={styles.label}>Delivery address</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Street, apartment, city"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        {/* Only riders see this. New riders register at the /rider link. */}
        {riderStatus ? (
          <Pressable style={styles.rider} onPress={() => router.push('/rider')}>
            <Text style={{ fontSize: 26 }}>🛵</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.riderTitle}>{riderStatus === 'approved' ? 'Rider mode' : `Rider account: ${riderStatus}`}</Text>
              <Text style={styles.meta}>
                {riderStatus === 'approved' ? 'Accept deliveries and share your live location' : 'Tap to view your rider account'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
        {user?.isAdmin ? (
          <Pressable style={styles.rider} onPress={() => router.push('/admin')}>
            <Text style={{ fontSize: 26 }}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.riderTitle}>Rider approvals</Text>
              <Text style={styles.meta}>Approve or suspend rider accounts</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ) : null}

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

        <View style={styles.legal}>
          <Pressable onPress={() => router.push('/privacy')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Pressable>
          <Text style={styles.meta}>·</Text>
          <Pressable onPress={() => router.push('/terms')}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </Pressable>
        </View>

        {user ? (
          <Pressable onPress={signOut} style={styles.signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        ) : null}
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
    marginTop: 16,
  },
  riderTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 28 },
  legalLink: { fontSize: 13, color: colors.muted, textDecorationLine: 'underline' },
  signOut: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  signOutText: { color: colors.primaryDark, fontWeight: '700' },
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
