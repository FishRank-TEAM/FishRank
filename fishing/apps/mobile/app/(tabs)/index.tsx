import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, Modal, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  DEFAULT_RANKING_SPECIES_ID,
  ALL_RANKING_SPECIES_ID,
  RANKING_SPECIES_LIST,
} from '@fishrank/shared';
import { api } from '@/lib/api';
import { SegmentedTabs } from '@/components/ui/ChipTabs';
import SpeciesChipScroll from '@/components/ui/SpeciesChipScroll';
import { LoadingState, EmptyState } from '@/components/ui/States';
import RankingProfileStrip from '@/components/home/RankingProfileStrip';
import RankingScopeTabs from '@/components/ranking/RankingScopeTabs';
import RankingPodium, { type RankingItem } from '@/components/ranking/RankingPodium';
import CatchThumb from '@/components/CatchThumb';
import { useAuthStore } from '@/store/auth.store';
import { formatLength } from '@/lib/format';
import { getImageUrl } from '@/lib/images';
import { prefetchCatch } from '@/lib/prefetch';
import { useListBottomInset } from '@/lib/useTabInsets';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/layout';
import { text } from '@/theme/text';

export default function RankingScreen() {
  const router = useRouter();
  const myNickname = useAuthStore((s) => s.user?.nickname);
  const [period, setPeriod] = useState('weekly');
  const [rankingType, setRankingType] = useState('official');
  const [speciesId, setSpeciesId] = useState(DEFAULT_RANKING_SPECIES_ID);
  const [bragItem, setBragItem] = useState<RankingItem | null>(null);

  const effectiveSpeciesId =
    rankingType === 'unofficial' && speciesId === DEFAULT_RANKING_SPECIES_ID
      ? ALL_RANKING_SPECIES_ID
      : speciesId;

  const { data, isPending, isFetching, refetch, isRefetching } = useQuery({
    queryKey: ['rankings', period, rankingType, effectiveSpeciesId],
    queryFn: async () => {
      const res = await api.get('/rankings', {
        params: {
          periodType: period,
          limit: 30,
          rankingType,
          speciesId: effectiveSpeciesId || undefined,
        },
      });
      return res.data.data as {
        rankings: RankingItem[];
        highlight?: RankingItem | null;
      };
    },
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const showInitialLoad = isPending && !data;

  const rankings = data?.rankings ?? [];
  const topThree = rankings.filter((r) => r.rank <= 3);
  const rest = rankings.filter((r) => r.rank > 3);
  const highlight = data?.highlight;

  const speciesTabs = [
    ...(rankingType === 'unofficial'
      ? [{ key: String(ALL_RANKING_SPECIES_ID), label: '전체' }]
      : []),
    ...RANKING_SPECIES_LIST.map((s) => ({ key: String(s.id), label: s.name })),
  ];

  const myRankEntry = myNickname
    ? rankings.find((r) => r.user.nickname === myNickname)
    : undefined;
  const myRank = myRankEntry?.rank ?? null;
  const listBottom = useListBottomInset(spacing.xl);

  return (
    <>
      <FlatList
        style={styles.list}
        data={rest}
        keyExtractor={(item) => item.catch.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.oceanBright} />
        }
        ListHeaderComponent={
          <>
            <RankingProfileStrip myRank={myRank} />
            <View style={styles.filters}>
              <RankingScopeTabs
                active="national"
                onNational={() => {}}
                onRegional={() => router.push('/ranking/regional')}
              />
              <View style={styles.filterRow}>
                <View style={styles.filterGroup}>
                  <Text style={styles.filterGroupLabel}>기록</Text>
                  <SegmentedTabs
                    compact
                    style={styles.filterSegment}
                    tabs={[
                      { key: 'official', label: '공식' },
                      { key: 'unofficial', label: '자랑' },
                    ]}
                    active={rankingType}
                    onChange={(v) => {
                      setRankingType(v);
                      if (v === 'official') setSpeciesId(DEFAULT_RANKING_SPECIES_ID);
                    }}
                  />
                </View>
                <View style={styles.filterGroup}>
                  <Text style={styles.filterGroupLabel}>기간</Text>
                  <SegmentedTabs
                    compact
                    style={styles.filterSegment}
                    tabs={[
                      { key: 'weekly', label: '주간' },
                      { key: 'alltime', label: '전체' },
                    ]}
                    active={period}
                    onChange={setPeriod}
                  />
                </View>
              </View>
              <SpeciesChipScroll
                compact
                fadeTo={colors.bg}
                tabs={speciesTabs}
                active={String(effectiveSpeciesId)}
                onChange={(v) => setSpeciesId(Number(v))}
              />
            </View>
            {!showInitialLoad && topThree.length > 0 ? (
              <RankingPodium
                items={topThree}
                rankingType={rankingType}
                onBragPress={setBragItem}
              />
            ) : null}
            {highlight ? (
              <View style={styles.highlight}>
                <Text style={styles.highlightLabel}>오늘의 하이라이트</Text>
                <Pressable
                  style={styles.highlightRow}
                  onPress={() => router.push(`/catch/${highlight.catch.id}`)}
                >
                  <CatchThumb imageUrl={highlight.catch.imageUrl} size={44} />
                  <View style={styles.highlightInfo}>
                    <Text style={styles.highlightName}>{highlight.user.nickname}</Text>
                    <Text style={styles.highlightMeta}>
                      {formatLength(highlight.lengthCm)} · {highlight.fishSpecies?.nameKo ?? ''}
                    </Text>
                  </View>
                </Pressable>
              </View>
            ) : null}
            {rest.length > 0 ? <Text style={styles.listTitle}>4위 이하</Text> : null}
          </>
        }
        ListEmptyComponent={
          showInitialLoad ? (
            <LoadingState message="랭킹 불러오는 중..." />
          ) : (
            <EmptyState
              icon="fish-outline"
              title="아직 랭킹 기록이 없어요"
              actionLabel={rankingType === 'official' ? '인증 촬영하기' : '자랑 올리기'}
              onAction={() =>
                router.push(rankingType === 'official' ? '/(tabs)/capture' : '/upload/personal')
              }
            />
          )
        }
        renderItem={({ item }) => {
          const isMe = myNickname && item.user.nickname === myNickname;
          return (
            <Pressable
              style={({ pressed }) => [styles.row, isMe && styles.rowHighlight, pressed && styles.rowPressed]}
              onPressIn={() => void prefetchCatch(item.catch.id)}
              onPress={() => router.push(`/catch/${item.catch.id}`)}
            >
              <View style={[styles.rankBadge, item.rank <= 3 && styles.rankBadgeTop]}>
                <Text style={styles.rank}>{item.rank}</Text>
              </View>
              <CatchThumb imageUrl={item.catch.imageUrl} size={44} />
              <View style={styles.info}>
                <Text style={styles.nickname}>
                  {item.user.nickname}
                  {isMe ? ' (나)' : ''}
                </Text>
                <Text style={styles.meta}>
                  {[
                    item.fishSpecies?.nameKo,
                    item.lengthCm ? formatLength(item.lengthCm) : null,
                    item.grade,
                    rankingType === 'unofficial' ? `추천 ${item.voteCount ?? 0}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={[styles.content, { paddingBottom: listBottom }]}
      />

      <Modal visible={!!bragItem} transparent animationType="fade" onRequestClose={() => setBragItem(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setBragItem(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {bragItem ? (
              <>
                {getImageUrl(bragItem.catch.imageUrl) ? (
                  <Image
                    source={{ uri: getImageUrl(bragItem.catch.imageUrl)! }}
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                ) : (
                  <CatchThumb imageUrl={null} size={160} style={styles.modalImage} />
                )}
                <Text style={styles.modalName}>{bragItem.user.nickname}</Text>
                <Text style={styles.modalMeta}>
                  추천 {bragItem.voteCount ?? bragItem.rankScore ?? 0} ·{' '}
                  {bragItem.fishSpecies?.nameKo ?? ''}
                </Text>
                <Pressable
                  style={styles.modalBtn}
                  onPress={() => {
                    setBragItem(null);
                    router.push(`/catch/${bragItem.catch.id}`);
                  }}
                >
                  <Text style={styles.modalBtnText}>상세 보기</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1 },
  filterSegment: { flex: 1, minWidth: 0 },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterGroup: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  filterGroupLabel: {
    ...text.bold(10),
    color: colors.textMuted,
    letterSpacing: 0.4,
    marginLeft: 2,
  },
  filters: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  highlight: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.successBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  highlightLabel: { ...text.bold(12), color: colors.success, marginBottom: spacing.sm },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  highlightInfo: { flex: 1 },
  highlightName: { ...text.bold(15), color: colors.textPrimary },
  highlightMeta: { ...text.regular(13), color: colors.textSub, marginTop: 2 },
  listTitle: {
    ...text.bold(13),
    color: colors.textMuted,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 10,
    minHeight: 72,
    ...shadow.soft,
  },
  rowHighlight: { borderColor: colors.brandGreen, backgroundColor: colors.oceanLight },
  rowPressed: { backgroundColor: colors.pressed },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.oceanLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeTop: { backgroundColor: colors.badgeBg },
  rank: { ...text.bold(14), color: colors.oceanDeep, ...text.center },
  info: { flex: 1, justifyContent: 'center', minWidth: 0 },
  nickname: { ...text.bold(15), color: colors.textPrimary },
  meta: { ...text.regular(12), color: colors.textSub, marginTop: 4, lineHeight: 18 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12 },
  modalName: { fontSize: 18, fontWeight: '800', color: colors.oceanDeep },
  modalMeta: { fontSize: 14, color: colors.textSub, marginTop: 4, marginBottom: 12 },
  modalBtn: {
    backgroundColor: colors.oceanBright,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  modalBtnText: { color: '#fff', fontWeight: '700' },
});
