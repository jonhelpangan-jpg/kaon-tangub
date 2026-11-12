import { Text } from 'react-native';

import { colors } from '../theme';

export type GoogleButtonProps = {
  clientId: string;
  /** Called with the Google ID token after the user picks an account. */
  onCredential: (credential: string) => void;
  onError: (message: string) => void;
};

/**
 * Phone-app (iOS/Android) placeholder. Google sign-in currently works in the web
 * version; the native apps need their own Google client IDs and a development build.
 */
export default function GoogleButton(_props: GoogleButtonProps) {
  return (
    <Text style={{ color: colors.muted, textAlign: 'center' }}>
      Google sign-in is available in the web version of Kaon Tangub for now.
    </Text>
  );
}
