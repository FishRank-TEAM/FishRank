import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import Screen from '@/components/ui/Screen';
import CatchThumb from '@/components/CatchThumb';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { formatLength } from '@/lib/format';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/layout';
import { text } from '@/theme/text';

type Row = {
  rank: number;
  user: { nickname: string };
  catch?: { id: string; imageUrl?: string };
  fishSpecies?: { nameKo?: string };
  lengthCm?: number;
  nickname?: string;
  speciesName?: string;
};

export default function RegionalDetailScreen() {
  const router = useRouter();
  const {
    regionKey,
    regionName,
    period = 'weekly',
    rankingType = 'official',
    speciesId,
  } = useLocalSearchParams<{
    regionKey: string;
    regionName: string;
    period?: string;
    rankingType?: string;
    speciesId?: string;
  }>();

  const { data, isLoading } = useQuery({
    queryKey: ['rankings', 'regional-detail', regionKey, period, rankingType, speciesId],
    queryFn: async () => {
      const res = await api.get('/rankings/regional/detail', {
        params: {
          regionKey,
          periodType: period,
          rankingType,
          limit: 30,
          speciesId: speciesId ? Number(speciesId) : undefined,
        },
      });
      return res.data.data.rankings as Row[];
    },
    enabled: !!regionKey,
  });

  return (
    <>
      <Stack.Screen options={{ title: String(regionName ?? '지역 랭킹') }} />
      <Screen scroll={false} padded={false}>
        {isLoading ? (
          <LoadingState />
        ) : (
          <FlatList
            data={data ?? []}
            keyExtractor={(item, i) => `${item.rank}-${i}`}
            ListEmptyComponent={<EmptyState title="기록이 없습니다" />}
            renderItem={({ item }) => {
              const nickname = item.user?.nickname ?? item.nickname ?? '-';
              const species = item.fishSpecies?.nameKo ?? item.speciesName ?? '-';
              const catchId = item.catch?.id;
              return (
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  disabled={!catchId}
                  onPress={() => catchId && router.push(`/catch/${catchId}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.rank}위, ${nickname}, ${species}, ${formatLength(item.lengthCm)}`}
                  accessibilityHint={catchId ? '탭하면 기록 상세를 볼 수 있습니다' : undefined}
                >
                  <View style={styles.rankBadge}>
                    <Text style={styles.rank}>{item.rank}</Text>
                  </View>
                  <CatchThumb imageUrl={item.catch?.imageUrl} size={44} />
                  <View style={styles.info}>
                    <Text style={styles.nickname}>{nickname}</Text>
                    <Text style={styles.meta}>
                      {species} · {formatLength(item.lengthCm)}
                    </Text>
                  </View>
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

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 68,
    ...shadow.soft,
  },
  rowPressed: { backgroundColor: colors.pressed },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.oceanLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rank: { ...text.bold(13), color: colors.oceanDeep },
  info: { flex: 1, minWidth: 0 },
  nickname: { ...text.bold(15), color: colors.textPrimary },
  meta: { ...text.regular(12), color: colors.textSub, marginTop: 2 },
});
