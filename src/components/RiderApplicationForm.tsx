import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { api } from '../api';
import { useAuth } from '../store/AuthContext';
import { colors, radius } from '../theme';
import { PrimaryButton } from './ui';

/** Rider registration. The owner approves it on the admin page before the rider can deliver. */
export default function RiderApplicationForm({ rejected }: { rejected: boolean }) {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [plate, setPlate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      setUser(await api.applyAsRider({ fullName, phone, vehicle, plate }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, value: string, onChange: (v: string) => void, placeholder: string, phonePad = false) => (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={phonePad ? 'phone-pad' : 'default'}
        accessibilityLabel={label}
        style={styles.input}
      />
    </View>
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Register as a rider</Text>
      <Text style={styles.sub}>
        {rejected
          ? 'Your previous application was not approved. You can update your details and apply again.'
          : `Signed in as ${user?.email}. Fill in your details; you can start delivering once Kaon Tangub approves your account.`}
      </Text>
      {field('Full name', fullName, setFullName, 'Juan Dela Cruz')}
      {field('Mobile number', phone, setPhone, '0917 123 4567', true)}
      {field('Vehicle', vehicle, setVehicle, 'Honda Click 125')}
      {field('Plate number (optional)', plate, setPlate, 'ABC 1234')}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label={busy ? 'Sending…' : 'Submit application'}
        disabled={busy || !fullName.trim() || !phone.trim() || !vehicle.trim()}
        onPress={submit}
        style={{ marginTop: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 10 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6 },
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
  error: { color: colors.primaryDark, fontWeight: '600' },
});
