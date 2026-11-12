import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../store/AuthContext';
import { colors, radius } from '../theme';
import { confirm } from './ui';

/** "Signed in as …" with a Sign out button. Pass `warning` to ask before signing out. */
export default function SignOutButton({ warning }: { warning?: string }) {
  const { user, signOut } = useAuth();
  if (!user) return null;

  const onPress = () => {
    if (warning) confirm('Sign out?', warning, 'Sign out', signOut);
    else signOut();
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.who}>Signed in as {user.email}</Text>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.btn}>
        <Text style={styles.text}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28, gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  who: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  btn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  text: { color: colors.primaryDark, fontWeight: '700' },
});
