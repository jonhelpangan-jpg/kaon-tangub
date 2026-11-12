import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { RETURN_TO_KEY } from '../store/AuthContext';
import { colors } from '../theme';
import type { GoogleButtonProps } from './GoogleButton';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const MODE_KEY = 'kaon-tangub-google-mode';
type Mode = 'popup' | 'redirect';

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript() {
  if (window.google?.accounts) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const el = document.createElement('script');
      el.src = SCRIPT_SRC;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => {
        scriptPromise = null;
        reject(new Error('Could not load Google sign-in'));
      };
      document.head.appendChild(el);
    });
  }
  return scriptPromise;
}

const savedMode = (): Mode => {
  try {
    return window.localStorage.getItem(MODE_KEY) === 'redirect' ? 'redirect' : 'popup';
  } catch {
    return 'popup';
  }
};

/**
 * The official "Continue with Google" button (Google Identity Services).
 *
 * Two ways to sign in:
 * - popup (default): Google opens a small window/tab and hands the result back to this page.
 * - redirect: this page goes to Google and comes back through the server. Slower-looking but
 *   works in phone browsers where the pop-up gets stuck on "Processing your request…".
 */
export default function GoogleButton({ clientId, onCredential, onError }: GoogleButtonProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>(savedMode);
  const handlers = useRef({ onCredential, onError });
  handlers.current = { onCredential, onError };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadGoogleScript()
      .then(() => {
        if (cancelled || !host.current || !window.google) return;
        host.current.innerHTML = '';
        if (mode === 'redirect') {
          // Remember where the user was so the app can return there after Google sends them back.
          const here = window.location.pathname;
          AsyncStorage.setItem(RETURN_TO_KEY, here === '/sign-in' ? '/cart' : here).catch(() => {});
        }
        window.google.accounts.id.initialize({
          client_id: clientId,
          ...(mode === 'redirect'
            ? { ux_mode: 'redirect', login_uri: `${window.location.origin}/api/auth/google/callback` }
            : {
                ux_mode: 'popup',
                callback: (response: { credential?: string }) => {
                  if (response.credential) handlers.current.onCredential(response.credential);
                  else handlers.current.onError('Google sign-in was cancelled.');
                },
              }),
        });
        window.google.accounts.id.renderButton(host.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 300,
        });
        setLoading(false);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setLoading(false);
          handlers.current.onError(`${e.message}. Check your internet connection and try again.`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, mode]);

  const toggle = () => {
    const next: Mode = mode === 'popup' ? 'redirect' : 'popup';
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {
      /* private browsing: just don't remember it */
    }
    setMode(next);
  };

  return (
    <View style={{ alignItems: 'center', minHeight: 44, gap: 14 }}>
      {loading ? <Text style={{ color: colors.muted }}>Loading Google sign-in…</Text> : null}
      <div ref={host} />
      <Pressable onPress={toggle} hitSlop={8}>
        <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', textDecorationLine: 'underline' }}>
          {mode === 'popup'
            ? 'Sign-in stuck or too slow? Tap here to use the other method'
            : 'Using the full-page sign-in method. Tap to switch back'}
        </Text>
      </Pressable>
    </View>
  );
}
