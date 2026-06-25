import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CatchThumb from '@/components/CatchThumb';
import { formatLength } from '@/lib/format';
import { colors } from '@/theme/colors';
import { text } from '@/theme/text';
import { radius, shadow, spacing } from '@/theme/layout';

export type RankingItem = {
  rank: number;
  user: { nickname: string; profileImage?: string | null };
  catch: { id: string; imageUrl?: string | null };
  fishSpecies?: { nameKo?: string };
  lengthCm?: number | null;
  grade?: string | null;
  voteCount?: number;
  rankScore?: number;
  recordType?: string;
  verified?: boolean;
};

const PODIUM_ORDER = [2, 1, 3] as const;

const TONE: Record<
  1 | 2 | 3,
  { gradient: [string, string]; border: string; badge: string; accent: string }
> = {
  1: { gradient: ['#fff8e1', '#ffe082'], border: '#d4a017', badge: '#c9a000', accent: '#8b6914' },
  2: { gradient: ['#f5f7fa', '#e2e8f0'], border: '#94a3b8', badge: '#64748b', accent: '#475569' },
  3: { gradient: ['#fff3e8', '#ffd4b0'], border: '#c97b3a', badge: '#b45309', accent: '#92400e' },
};

type Props = {
  items: RankingItem[];
  rankingType: string;
  onBragPress?: (item: RankingItem) => void;
};

export default function RankingPodium({ items, rankingType, onBragPress }: Props) {
  const router = useRouter();
  const isUnofficial = rankingType === 'unofficial';
  const byRank = new Map(items.filter((i) => i.rank <= 3).map((i) => [i.rank, i]));
  const slots = PODIUM_ORDER.filter((r) => byRank.has(r)).map((rank) => ({
    rank,
    item: byRank.get(rank)!,
  }));

  if (!slots.length) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headingRow}>
        <Ionicons name="ribbon" size={16} color={colors.oceanBright} />
        <Text style={styles.heading}>명예의 전당</Text>
      </View>
      <View style={styles.stage}>
        {slots.map(({ rank, item }) => {
          const tone = TONE[rank as 1 | 2 | 3];
          const isFirst = rank === 1;
          const thumbSize = isFirst ? 56 : 46;
          return (
            <Pressable
              key={item.catch.id}
              style={[
                styles.slotOuter,
                { flex: isFirst ? 1.08 : 1, marginTop: isFirst ? 0 : 10 },
              ]}
              onPress={() => {
                if (isUnofficial && onBragPress) onBragPress(item);
                else router.push(`/catch/${item.catch.id}`);
              }}
            >
              <LinearGradient
                colors={tone.gradient}
                style={[styles.slot, { borderColor: tone.border }, isFirst && shadow.card]}
              >
                <View style={[styles.rankBadge, { backgroundColor: tone.badge }]}>
                  <Text style={styles.rankNum}>{rank}</Text>
                </View>

                <View style={styles.thumbWrap}>
                  <CatchThumb imageUrl={item.catch.imageUrl} size={thumbSize} />
                </View>

                <Text style={[styles.name, isFirst && styles.nameFirst]} numberOfLines={1}>
                  {item.user.nickname}
                </Text>

                {isUnofficial ? (
                  <View style={styles.statRow}>
                    <Ionicons name="thumbs-up" size={12} color={tone.accent} />
                    <Text style={[styles.stat, { color: tone.accent }]}>
                      {item.voteCount ?? item.rankScore ?? 0}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.statBlock}>
                    <Text style={[styles.length, { color: tone.accent }]}>
                      {formatLength(item.lengthCm)}
                    </Text>
                    {item.grade ? (
                      <View style={[styles.gradePill, { backgroundColor: tone.badge }]}>
                        <Text style={styles.gradeText}>{item.grade}</Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.peekHint}>
        <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        <Text style={styles.peekText}>아래로 더 보기</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: spacing.lg, marginBottom: spacing.lg, overflow: 'visible' },
  peekHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  peekText: { ...text.regular(11), color: colors.textMuted },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  heading: { ...text.bold(15), color: colors.oceanDeep },
  stage: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  slotOuter: { flex: 1, minWidth: 0, flexShrink: 1 },
  slot: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: 4,
    minHeight: 150,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  rankNum: { ...text.bold(13), color: '#fff', ...text.center },
  thumbWrap: { marginBottom: spacing.sm },
  name: {
    ...text.bold(11),
    color: colors.textPrimary,
    maxWidth: '100%',
    ...text.center,
    paddingHorizontal: 4,
  },
  nameFirst: { ...text.bold(12), color: colors.oceanDeep },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  },
  stat: { ...text.regular(12) },
  statBlock: { alignItems: 'center', marginTop: 4, gap: 4 },
  length: { ...text.bold(14), ...text.center },
  gradePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    minWidth: 28,
    alignItems: 'center',
  },
  gradeText: { ...text.bold(11), color: '#fff', ...text.center },
});
