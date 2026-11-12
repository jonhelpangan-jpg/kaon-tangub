import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { colors } from '../theme';
import type { GoogleButtonProps } from './GoogleButton';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
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

/** The official "Continue with Google" button (Google Identity Services). */
export default function GoogleButton({ clientId, onCredential, onError }: GoogleButtonProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const handlers = useRef({ onCredential, onError });
  handlers.current = { onCredential, onError };

  useEffect(() => {
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !host.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) handlers.current.onCredential(response.credential);
            else handlers.current.onError('Google sign-in was cancelled.');
          },
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
  }, [clientId]);

  return (
    <View style={{ alignItems: 'center', minHeight: 44 }}>
      {loading ? <Text style={{ color: colors.muted }}>Loading Google sign-in…</Text> : null}
      <div ref={host} />
    </View>
  );
}
