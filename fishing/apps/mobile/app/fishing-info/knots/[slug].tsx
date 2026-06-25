import { Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import Screen from '@/components/ui/Screen';
import { getKnotBySlug, KNOT_DIFFICULTY_LABEL } from '@/data/knots';
import { colors } from '@/theme/colors';

export default function KnotDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const knot = getKnotBySlug(String(slug));

  if (!knot) {
    return (
      <>
        <Stack.Screen options={{ title: '매듭' }} />
        <Screen>
          <Text>매듭을 찾을 수 없습니다.</Text>
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: knot.nameKo }} />
      <Screen>
        <Text style={styles.name}>{knot.nameKo}</Text>
        <Text style={styles.sub}>{knot.nameEn} · {KNOT_DIFFICULTY_LABEL[knot.difficulty]}</Text>
        <Text style={styles.desc}>{knot.summary}</Text>
        <Text style={styles.section}>묶는 방법</Text>
        {knot.steps.map((step, i) => (
          <Text key={i} style={styles.step}>
            {i + 1}. {step}
          </Text>
        ))}
        {knot.tips?.length ? (
          <>
            <Text style={styles.section}>팁</Text>
            {knot.tips.map((tip, i) => (
              <Text key={i} style={styles.tip}>• {tip}</Text>
            ))}
          </>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 22, fontWeight: '800', color: colors.oceanDeep },
  sub: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  desc: { fontSize: 15, lineHeight: 22, color: colors.textPrimary, marginBottom: 16 },
  section: { fontSize: 16, fontWeight: '700', color: colors.oceanDeep, marginTop: 12, marginBottom: 8 },
  step: { fontSize: 14, lineHeight: 22, color: colors.textPrimary, marginBottom: 6 },
  tip: { fontSize: 13, color: colors.textSub, marginBottom: 4 },
});
