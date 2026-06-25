import { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  DEFAULT_RANKING_SPECIES_ID,
  ALL_RANKING_SPECIES_ID,
  RANKING_SPECIES_LIST,
} from '@fishrank/shared';
import { api } from '@/lib/api';
import Screen from '@/components/ui/Screen';
import { SegmentedTabs } from '@/components/ui/ChipTabs';
import SpeciesChipScroll from '@/components/ui/SpeciesChipScroll';
import { LoadingState, EmptyState } from '@/components/ui/States';
import RankingScopeTabs from '@/components/ranking/RankingScopeTabs';
import { useAuthStore } from '@/store/auth.store';
import {
  getMyRegionKey,
  sortRegionsWithMine,
  regionalRowLabel,
  formatDistrictLabel,
} from '@/lib/regional-ranking';
import type { Region, RegionalNavParams } from '@/types/regional-ranking';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/layout';
import { text } from '@/theme/text';

const REGION_EMOJI: Record<string, string> = {
  서울: '🏙',
  부산: '🌊',
  제주: '🏝',
  경기: '🎣',
  강원: '⛰',
  충북: '🌾',
  충남: '🌅',
  전북: '🐟',
  전남: '🦐',
  경북: '🌲',
  경남: '⚓',
  대구: '🏔',
  인천: '🚢',
  광주: '🌿',
  대전: '🔬',
  울산: '🏭',
  세종: '🏛',
};

function regionIcon(name: string) {
  const key = Object.keys(REGION_EMOJI).find((k) => name.startsWith(k));
  return key ? REGION_EMOJI[key] : '📍';
}

export default function RegionalRankingScreen() {
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [period, setPeriod] = useState('weekly');
  const [rankingType, setRankingType] = useState('official');
  const [speciesId, setSpeciesId] = useState(DEFAULT_RANKING_SPECIES_ID);

  const effectiveSpeciesId =
    rankingType === 'unofficial' ? ALL_RANKING_SPECIES_ID : speciesId;

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data.data,
    enabled: isLoggedIn,
    staleTime: 2 * 60_000,
  });

  const myRegionKey = getMyRegionKey(me?.activityRegion);
  const myDistrictLabel = formatDistrictLabel(me?.activityRegion);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['rankings', 'regional', period, rankingType, effectiveSpeciesId],
    queryFn: async () => {
      const res = await api.get('/rankings/regional', {
        params: {
          periodType: period,
          level: 'sido',
          rankingType,
          speciesId: effectiveSpeciesId || undefined,
        },
      });
      return res.data.data.regions as Region[];
    },
  });

  const regions = useMemo(
    () => sortRegionsWithMine(data ?? [], myRegionKey),
    [data, myRegionKey],
  );

  const myRegion = myRegionKey ? regions.find((r) => r.regionKey === myRegionKey) : undefined;

  const speciesTabs = [
    ...(rankingType === 'unofficial'
      ? [{ key: String(ALL_RANKING_SPECIES_ID), label: '전체' }]
      : []),
    ...RANKING_SPECIES_LIST.map((s) => ({ key: String(s.id), label: s.name })),
  ];

  const openDetail = (item: Region) => {
    const params: RegionalNavParams = {
      regionKey: item.regionKey,
      regionName: item.regionName,
      period,
      rankingType,
      speciesId: String(effectiveSpeciesId),
    };
    router.push({ pathname: '/ranking/regional-detail', params });
  };

  return (
    <>
      <Stack.Screen options={{ title: '지역별 랭킹' }} />
      <Screen scroll={false} padded={false}>
        <View style={styles.filters}>
          <RankingScopeTabs
            active="regional"
            onNational={() => router.push('/(tabs)/')}
            onRegional={() => {}}
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

        {isLoading ? (
          <LoadingState message="지역 랭킹 불러오는 중..." />
        ) : (
          <FlatList
            data={regions}
            keyExtractor={(item) => item.regionKey}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.oceanBright} />
            }
            ListHeaderComponent={
              myRegion ? (
                <MyRegionBanner
                  region={myRegion}
                  districtLabel={myDistrictLabel}
                  onPress={() => openDetail(myRegion)}
                />
              ) : isLoggedIn ? null : (
                <GuestRegionHint onLogin={() => router.push('/(auth)/login')} />
              )
            }
            ListEmptyComponent={<EmptyState icon="map-outline" title="지역 랭킹이 없습니다" />}
            renderItem={({ item, index }) => {
              const isMine = item.regionKey === myRegionKey;
              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.row,
                    isMine && styles.rowMine,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => openDetail(item)}
                  accessibilityRole="button"
                  accessibilityLabel={regionalRowLabel(item, index, isMine)}
                  accessibilityHint="탭하면 지역 상세 랭킹을 볼 수 있습니다"
                >
                  <View style={[styles.rankNum, isMine && styles.rankNumMine]}>
                    <Text style={[styles.rankNumText, isMine && styles.rankNumTextMine]}>
                      {index + 1}
                    </Text>
                  </View>
                  <Text style={styles.regionIcon} accessibilityElementsHidden>
                    {regionIcon(item.regionName)}
                  </Text>
                  <View style={styles.regionInfo}>
                    <View style={styles.regionTitleRow}>
                      <Text style={styles.region}>{item.regionName}</Text>
                      {isMine ? (
                        <View style={styles.mineBadge}>
                          <Text style={styles.mineBadgeText}>내 지역</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.top}>
                      {item.topNickname
                        ? `👑 ${item.topNickname} · ${item.topLengthCm ?? '-'}cm`
                        : '기록 없음'}
                    </Text>
                    {item.speciesName ? (
                      <Text style={styles.species}>{item.speciesName}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              );
            }}
            contentContainerStyle={styles.list}
          />
        )}
      </Screen>
    </>
  );
}

function MyRegionBanner({
  region,
  districtLabel,
  onPress,
}: {
  region: Region;
  districtLabel?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.banner, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`내 활동 지역 ${region.regionName}${districtLabel ? ` ${districtLabel}` : ''} 랭킹 바로가기`}
    >
      <View style={styles.bannerIcon}>
        <Ionicons name="location" size={18} color={colors.brandGreen} />
      </View>
      <View style={styles.bannerText}>
        <Text style={styles.bannerLabel}>내 활동 지역</Text>
        <Text style={styles.bannerTitle}>
          {region.regionName}
          {districtLabel ? ` · ${districtLabel}` : ''}
        </Text>
        <Text style={styles.bannerMeta} numberOfLines={1}>
          {region.topNickname
            ? `1위 ${region.topNickname} · ${region.topLengthCm ?? '-'}cm`
            : '아직 기록이 없어요'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.brandNavy} />
    </Pressable>
  );
}

function GuestRegionHint({ onLogin }: { onLogin: () => void }) {
  return (
    <Pressable style={styles.guestHint} onPress={onLogin} accessibilityRole="button">
      <Ionicons name="log-in-outline" size={16} color={colors.brandNavy} />
      <Text style={styles.guestHintText}>로그인하면 내 지역 랭킹을 바로 볼 수 있어요</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filters: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
    backgroundColor: colors.bg,
  },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterGroup: { flex: 1, minWidth: 0, gap: 4 },
  filterGroupLabel: {
    ...text.bold(10),
    color: colors.textMuted,
    letterSpacing: 0.4,
    marginLeft: 2,
  },
  filterSegment: { flex: 1, minWidth: 0 },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.oceanLight,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brandGreen,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: { flex: 1, minWidth: 0 },
  bannerLabel: { ...text.bold(10), color: colors.brandGreen, letterSpacing: 0.3 },
  bannerTitle: { ...text.bold(16), color: colors.brandNavy, marginTop: 2 },
  bannerMeta: { ...text.regular(12), color: colors.textSub, marginTop: 4 },
  guestHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guestHintText: { flex: 1, ...text.regular(13), color: colors.brandNavy },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    minHeight: 68,
    ...shadow.soft,
  },
  rowMine: {
    borderColor: colors.brandGreen,
    backgroundColor: colors.oceanLight,
  },
  rowPressed: { opacity: 0.92, backgroundColor: colors.pressed },
  rankNum: { width: 28, alignItems: 'center' },
  rankNumMine: {
    backgroundColor: colors.brandGreen,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
  },
  rankNumText: { ...text.bold(12), color: colors.textMuted },
  rankNumTextMine: { color: '#fff' },
  regionIcon: { fontSize: 22 },
  regionInfo: { flex: 1, minWidth: 0 },
  regionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  region: { ...text.bold(16), color: colors.textPrimary },
  mineBadge: {
    backgroundColor: colors.brandGreen,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  mineBadgeText: { ...text.bold(10), color: '#fff' },
  top: { ...text.regular(13), color: colors.textSub, marginTop: 4 },
  species: { ...text.regular(11), color: colors.textMuted, marginTop: 2 },
});
