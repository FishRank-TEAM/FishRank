import { Text, StyleSheet, Pressable, View } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import Screen from '@/components/ui/Screen';
import {
  KNOTS,
  KNOT_CATEGORY_LABEL,
  KNOT_DIFFICULTY_LABEL,
  KNOTS_DISCLAIMER,
  getAdjacentKnots,
  getKnotBySlug,
} from '@/data/knots';
import { colors } from '@/theme/colors';

export default function KnotDetailScreen() {
  const router = useRouter();
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

  const related = KNOTS.filter(
    (item) => item.category === knot.category && item.slug !== knot.slug,
  ).slice(0, 3);
  const { prev, next } = getAdjacentKnots(knot.slug);

  return (
    <>
      <Stack.Screen options={{ title: knot.nameKo }} />
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>{knot.icon}</Text>
          <View style={styles.heroBody}>
            <Text style={styles.name}>{knot.nameKo}</Text>
            <Text style={styles.sub}>
              {knot.nameEn} · {KNOT_DIFFICULTY_LABEL[knot.difficulty]} ·{' '}
              {KNOT_CATEGORY_LABEL[knot.category]}
            </Text>
          </View>
        </View>

        <Text style={styles.desc}>{knot.summary}</Text>
        {knot.strength ? <Text style={styles.strength}>{knot.strength}</Text> : null}

        {knot.tags && knot.tags.length > 0 ? (
          <View style={styles.tags}>
            {knot.tags.map((tag) => (
              <Text key={tag} style={styles.tag}>
                {tag}
              </Text>
            ))}
          </View>
        ) : null}

        <Text style={styles.section}>묶는 방법</Text>
        {knot.steps.map((step, i) => (
          <View key={`${i}-${step}`} style={styles.stepRow}>
            <Text style={styles.stepNum}>{i + 1}</Text>
            <Text style={styles.step}>{step}</Text>
          </View>
        ))}

        {knot.tips?.length ? (
          <>
            <Text style={styles.section}>팁</Text>
            {knot.tips.map((tip) => (
              <Text key={tip} style={styles.tip}>
                • {tip}
              </Text>
            ))}
          </>
        ) : null}

        {related.length > 0 ? (
          <>
            <Text style={styles.section}>같은 유형 매듭</Text>
            {related.map((item) => (
              <Pressable
                key={item.slug}
                style={styles.related}
                onPress={() => router.push(`/fishing-info/knots/${item.slug}`)}
              >
                <Text style={styles.relatedIcon}>{item.icon}</Text>
                <View>
                  <Text style={styles.relatedName}>{item.nameKo}</Text>
                  <Text style={styles.relatedEn}>{item.nameEn}</Text>
                </View>
              </Pressable>
            ))}
          </>
        ) : null}

        {(prev || next) ? (
          <View style={styles.adjacent}>
            {prev ? (
              <Pressable
                style={styles.adjacentBtn}
                onPress={() => router.push(`/fishing-info/knots/${prev.slug}`)}
              >
                <Text style={styles.adjacentHint}>← 이전</Text>
                <Text style={styles.adjacentName}>{prev.nameKo}</Text>
              </Pressable>
            ) : (
              <View style={styles.adjacentBtn} />
            )}
            {next ? (
              <Pressable
                style={[styles.adjacentBtn, styles.adjacentBtnNext]}
                onPress={() => router.push(`/fishing-info/knots/${next.slug}`)}
              >
                <Text style={styles.adjacentHint}>다음 →</Text>
                <Text style={styles.adjacentName}>{next.nameKo}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.disclaimer}>{KNOTS_DISCLAIMER}</Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.oceanDeep,
  },
  heroIcon: { fontSize: 32 },
  heroBody: { flex: 1 },
  name: { fontSize: 20, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  desc: { fontSize: 15, lineHeight: 22, color: colors.textPrimary, marginBottom: 8 },
  strength: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.oceanDeep,
    marginBottom: 8,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tag: {
    fontSize: 11,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.oceanDeep,
    marginTop: 16,
    marginBottom: 8,
  },
  stepRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '800',
    color: colors.oceanDeep,
    backgroundColor: colors.oceanLight,
  },
  step: { flex: 1, fontSize: 14, lineHeight: 22, color: colors.textPrimary },
  tip: { fontSize: 13, color: colors.textSub, marginBottom: 4, lineHeight: 20 },
  related: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  relatedIcon: { fontSize: 22 },
  relatedName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  relatedEn: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  adjacent: { flexDirection: 'row', gap: 10, marginTop: 16 },
  adjacentBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  adjacentBtnNext: { alignItems: 'flex-end' },
  adjacentHint: { fontSize: 11, color: colors.textMuted },
  adjacentName: { fontSize: 14, fontWeight: '700', color: colors.oceanDeep, marginTop: 2 },
  disclaimer: {
    marginTop: 20,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
