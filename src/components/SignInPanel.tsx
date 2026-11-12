import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, ServerConfig } from '../api';
import { useAuth } from '../store/AuthContext';
import { colors, radius } from '../theme';
import GoogleButton from './GoogleButton';
import { PrimaryButton } from './ui';

/** Logo, a line of explanation and the Google button. Used wherever sign-in is needed. */
export default function SignInPanel({ title, subtitle }: { title: string; subtitle: string }) {
  const { signInWithGoogle, signInForTesting } = useAuth();
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    api
      .config()
      .then(setConfig)
      .catch((e: Error) => setError(e.message));
  }, []);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} accessibilityLabel="Kaon Tangub" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {busy ? <Text style={styles.subtitle}>Signing you in…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {config?.googleClientId ? (
        <GoogleButton
          clientId={config.googleClientId}
          onCredential={(credential) => run(() => signInWithGoogle(credential))}
          onError={setError}
        />
      ) : config ? (
        <Text style={styles.error}>Google sign-in has not been set up on the server yet.</Text>
      ) : null}

      {config?.testLogin ? (
        <View style={styles.test}>
          <Text style={styles.testLabel}>Test login (local testing only)</Text>
          <TextInput
            value={testEmail}
            onChangeText={setTestEmail}
            placeholder="test email"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={styles.input}
          />
          <PrimaryButton
            label="Test sign in"
            disabled={busy || !testEmail.includes('@')}
            onPress={() => run(() => signInForTesting(testEmail.trim(), testEmail.split('@')[0]))}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12, padding: 24 },
  logo: { width: 96, height: 96, borderRadius: 22, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.muted, textAlign: 'center', marginBottom: 8 },
  error: { color: colors.primaryDark, fontWeight: '600', textAlign: 'center' },
  test: { alignSelf: 'stretch', gap: 8, marginTop: 20, padding: 12, borderRadius: radius.md, backgroundColor: colors.accentSoft },
  testLabel: { fontSize: 12, fontWeight: '700', color: colors.accentText },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
  },
});
