import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { api, ApiError, setSessionToken, User } from '../api';

type Ctx = {
  /** null while signed out. */
  user: User | null;
  /** false until the saved session (if any) has been checked. */
  ready: boolean;
  signInWithGoogle: (credential: string) => Promise<void>;
  signInForTesting: (email: string, name: string) => Promise<void>;
  signOut: () => void;
  /** Message from a failed redirect sign-in, if any. */
  signInError: string | null;
  /** Re-reads the account from the server (e.g. to see if a rider was approved). */
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<Ctx | null>(null);
const TOKEN_KEY = 'kaon-tangub-session';
/** Where to go back to after a redirect-style Google sign-in (web only). */
export const RETURN_TO_KEY = 'kaon-tangub-return-to';

/** After a redirect sign-in the server sends us back with #session=… or #signin_error=… in the address. */
function readSignInFragment(): { token?: string; error?: string } {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.location.hash) return {};
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get('session') ?? undefined;
  const error = params.get('signin_error') ?? undefined;
  if (token || error) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return { token, error };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const signOut = useCallback(() => {
    setSessionToken(null);
    setUser(null);
    AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await api.me());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) signOut();
    }
  }, [signOut]);

  // Restore the saved session when the app opens.
  useEffect(() => {
    (async () => {
      try {
        const fragment = readSignInFragment();
        if (fragment.error) setSignInError(fragment.error);
        if (fragment.token) await AsyncStorage.setItem(TOKEN_KEY, fragment.token);
        const token = fragment.token ?? (await AsyncStorage.getItem(TOKEN_KEY));
        if (token) {
          setSessionToken(token);
          await refreshUser();
        }
        if (fragment.token) {
          const returnTo = await AsyncStorage.getItem(RETURN_TO_KEY);
          await AsyncStorage.removeItem(RETURN_TO_KEY);
          if (returnTo && returnTo.startsWith('/') && returnTo !== '/') setTimeout(() => router.push(returnTo as never), 0);
        }
      } finally {
        setReady(true);
      }
    })();
  }, [refreshUser]);

  const finish = useCallback(async (session: { token: string; user: User }) => {
    setSessionToken(session.token);
    setUser(session.user);
    await AsyncStorage.setItem(TOKEN_KEY, session.token).catch(() => {});
  }, []);

  const signInWithGoogle = useCallback(
    async (credential: string) => finish(await api.signInWithGoogle(credential)),
    [finish],
  );
  const signInForTesting = useCallback(
    async (email: string, name: string) => finish(await api.signInForTesting(email, name)),
    [finish],
  );

  return (
    <AuthContext.Provider value={{ user, ready, signInError, signInWithGoogle, signInForTesting, signOut, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
