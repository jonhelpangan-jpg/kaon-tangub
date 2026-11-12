import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView } from 'react-native';

import SignInPanel from '../components/SignInPanel';
import { useAuth } from '../store/AuthContext';
import { colors } from '../theme';

/** Customer sign-in. Closes itself as soon as the user is signed in. */
export default function SignInScreen() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [user]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: 32 }}>
      <SignInPanel title="Sign in to order" subtitle="Use your Google account to place orders and track your deliveries." />
    </ScrollView>
  );
}
