import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdminRider, api, RiderStatus } from '../api';
import SignInPanel from '../components/SignInPanel';
import SignOutButton from '../components/SignOutButton';
import { EmptyState } from '../components/ui';
import { useAuth } from '../store/AuthContext';
import { colors, radius, shadow } from '../theme';

const statusColor: Record<RiderStatus, string> = {
  pending: colors.accentText,
  approved: colors.success,
  rejected: colors.muted,
  suspended: colors.primaryDark,
};

/** Owner-only page: approve, reject or suspend rider accounts. */
export default function AdminScreen() {
  const { user, ready } = useAuth();
  const [riders, setRiders] = useState<AdminRider[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRiders(await api.adminRiders());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (user?.isAdmin) load();
  }, [user?.isAdmin, load]);

  if (!ready) return null;
  if (!user) {
    return (
      <ScrollView style={styles.screen}>
        <SignInPanel title="Admin" subtitle="Sign in with the owner's Google account." />
      </ScrollView>
    );
  }
  if (!user.isAdmin) {
    return (
      <ScrollView style={styles.screen}>
        <EmptyState emoji="🔒" title="Admins only" subtitle={`${user.email} is not an admin account. Sign out to switch accounts.`} />
        <SignOutButton />
      </ScrollView>
    );
  }

  const act = async (id: string, action: 'approve' | 'reject' | 'suspend') => {
    setBusy(true);
    try {
      await api.adminSetRider(id, action);
    } catch (e) {
      setError((e as Error).message);
    }
    await load();
    setBusy(false);
  };

  const pending = riders?.filter((r) => r.rider.status === 'pending') ?? [];
  const others = riders?.filter((r) => r.rider.status !== 'pending') ?? [];

  const card = (r: AdminRider) => (
    <View key={r.id} style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.name}>{r.rider.fullName}</Text>
        <Text style={[styles.status, { color: statusColor[r.rider.status] }]}>{r.rider.status.toUpperCase()}</Text>
      </View>
      <Text style={styles.meta}>{r.email}</Text>
      <Text style={styles.meta}>
        {r.rider.phone} · {r.rider.vehicle}
        {r.rider.plate ? ` · ${r.rider.plate}` : ''}
      </Text>
      <Text style={styles.meta}>Applied {new Date(r.rider.appliedAt).toLocaleString()}</Text>
      <View style={styles.actions}>
        {r.rider.status !== 'approved' ? (
          <Pressable disabled={busy} style={[styles.btn, styles.btnApprove]} onPress={() => act(r.id, 'approve')}>
            <Text style={[styles.btnText, { color: '#fff' }]}>Approve</Text>
          </Pressable>
        ) : null}
        {r.rider.status === 'pending' ? (
          <Pressable disabled={busy} style={styles.btn} onPress={() => act(r.id, 'reject')}>
            <Text style={styles.btnText}>Reject</Text>
          </Pressable>
        ) : null}
        {r.rider.status === 'approved' ? (
          <Pressable disabled={busy} style={styles.btn} onPress={() => act(r.id, 'suspend')}>
            <Text style={styles.btnText}>Suspend</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.h2}>Waiting for approval ({pending.length})</Text>
      {pending.length ? pending.map(card) : <Text style={styles.meta}>No new rider applications.</Text>}
      <Text style={styles.h2}>All riders ({others.length})</Text>
      {others.length ? others.map(card) : <Text style={styles.meta}>No riders yet.</Text>}
      <Pressable onPress={load} style={[styles.btn, { marginTop: 20 }]}>
        <Text style={styles.btnText}>Refresh</Text>
      </Pressable>
      <SignOutButton />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  h2: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 16, marginBottom: 10 },
  error: { color: colors.primaryDark, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 12, gap: 3, ...shadow },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 },
  status: { fontSize: 12, fontWeight: '800' },
  meta: { fontSize: 13, color: colors.muted },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnApprove: { backgroundColor: colors.success, borderColor: colors.success },
  btnText: { fontWeight: '700', color: colors.text },
});
