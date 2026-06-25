import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import Screen from '@/components/ui/Screen';
import CatchThumb from '@/components/CatchThumb';
import UserAvatar from '@/components/ui/UserAvatar';
import AppCard from '@/components/ui/AppCard';
import { ListRowSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/States';
import { formatActivityRegionLabel } from '@/data/korean-regions';
import { formatLength } from '@/lib/format';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { radius, shadow, spacing } from '@/theme/layout';

export default function ProfileScreen() {
  const { nickname } = useLocalSearchParams<{ nickname: string }>();
  const router = useRouter();

  const { data, isPending } = useQuery({
    queryKey: ['profile', nickname],
    queryFn: async () => (await api.get(`/users/profile/${nickname}`)).data.data,
    enabled: !!nickname,
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });

  if (isPending && !data) {
    return (
      <>
        <Stack.Screen options={{ title: String(nickname) }} />
        <Screen scroll={false} padded={false}>
          <ListRowSkeleton />
          <ListRowSkeleton />
          <ListRowSkeleton />
        </Screen>
      </>
    );
  }

  const catches = [...(data?.certifiedCatches ?? []), ...(data?.personalCatches ?? [])];

  return (
    <>
      <Stack.Screen options={{ title: String(nickname) }} />
      <Screen scroll={false} padded={false}>
        <AppCard style={styles.header}>
          <View style={styles.headerTop}>
            <UserAvatar nickname={data?.nickname ?? String(nickname)} profileImage={data?.profileImage} size={64} />
            <View style={styles.headerInfo}>
              <Text style={styles.name}>{data?.nickname ?? nickname}</Text>
              <Text style={styles.stats}>
                인증 {data?.stats?.certifiedCount ?? 0} · 자랑 {data?.stats?.personalCount ?? 0}
              </Text>
            </View>
          </View>
          {data?.bio ? <Text style={styles.bio}>{data.bio}</Text> : null}
          <View style={styles.badges}>
            {data?.activityRegion ? (
              <View style={styles.badgeRow}>
                <Ionicons name="location-outline" size={12} color={colors.oceanDeep} />
                <Text style={styles.badge}>{formatActivityRegionLabel(data.activityRegion)}</Text>
              </View>
            ) : null}
            {data?.fishingCategory ? (
              <Text style={styles.badge}>
                {data.fishingCategory === 'freshwater'
                  ? '민물'
                  : data.fishingCategory === 'saltwater'
                    ? '바다'
                    : '민물·바다'}
              </Text>
            ) : null}
          </View>
        </AppCard>

        <Text style={styles.section}>기록</Text>
        <FlatList
          data={catches}
          keyExtractor={(item: { id: string }) => item.id}
          ListEmptyComponent={
            <EmptyState icon="fish-outline" title="기록이 없습니다" />
          }
          renderItem={({
            item,
          }: {
            item: {
              id: string;
              imageUrl?: string;
              speciesName?: string;
              lengthCm?: number;
              locationName?: string;
              recordType?: string;
            };
          }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/catch/${item.id}`)}>
              <CatchThumb imageUrl={item.imageUrl} size={48} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowType}>
                  {item.recordType === 'personal' ? '자랑' : '공식'}
                </Text>
                <Text style={styles.rowMain}>
                  {item.speciesName ?? '-'} · {formatLength(item.lengthCm)}
                </Text>
                <Text style={styles.rowSub}>{item.locationName ?? '-'}</Text>
              </View>
            </Pressable>
          )}
          contentContainerStyle={styles.list}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header: { margin: spacing.lg, marginBottom: spacing.sm },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerInfo: { flex: 1 },
  name: { fontSize: 22, fontWeight: '800', color: colors.oceanDeep, fontFamily: fonts.bold },
  bio: { fontSize: 14, color: colors.textSub, marginTop: spacing.md, lineHeight: 20, fontFamily: fonts.regular },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badge: {
    fontSize: 12,
    color: colors.oceanDeep,
    backgroundColor: colors.oceanLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
    fontFamily: fonts.regular,
  },
  stats: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontFamily: fonts.regular },
  section: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.oceanDeep,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: fonts.bold,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
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
    ...shadow.soft,
  },
  rowInfo: { flex: 1 },
  rowType: { fontSize: 10, fontWeight: '700', color: colors.oceanBright, marginBottom: 2, fontFamily: fonts.bold },
  rowMain: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, fontFamily: fonts.bold },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontFamily: fonts.regular },
});
