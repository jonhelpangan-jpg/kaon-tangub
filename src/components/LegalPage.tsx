import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export type LegalSection = { heading: string; body: string[] };

/** Simple readable page used for the privacy policy and terms of service. */
export default function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: LegalSection[] }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.updated}>Last updated: {updated}</Text>
      {sections.map((s) => (
        <View key={s.heading} style={{ marginTop: 20 }}>
          <Text style={styles.heading}>{s.heading}</Text>
          {s.body.map((p, i) => (
            <Text key={i} style={styles.p}>
              {p}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  updated: { fontSize: 13, color: colors.muted, marginTop: 4 },
  heading: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  p: { fontSize: 15, lineHeight: 22, color: colors.text, marginBottom: 8 },
});
