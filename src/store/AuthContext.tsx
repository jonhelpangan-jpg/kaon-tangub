import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { api, ApiError, setSessionToken, User } from '../api';

type Ctx = {
  /** null while signed out. */
  user: User | null;
  /** false until the saved session (if any) has been checked. */
  ready: boolean;
  signInWithGoogle: (credential: string) => Promise<void>;
  signInForTesting: (email: string, name: string) => Promise<void>;
  signOut: () => void;
  /** Re-reads the account from the server (e.g. to see if a rider was approved). */
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<Ctx | null>(null);
const TOKEN_KEY = 'kaon-tangub-session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

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
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (token) {
          setSessionToken(token);
          await refreshUser();
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
    <AuthContext.Provider value={{ user, ready, signInWithGoogle, signInForTesting, signOut, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
