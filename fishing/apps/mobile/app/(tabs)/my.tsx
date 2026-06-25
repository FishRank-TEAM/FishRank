import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import CatchThumb from '@/components/CatchThumb';
import UserAvatar from '@/components/ui/UserAvatar';
import AppCard from '@/components/ui/AppCard';
import { SegmentedTabs } from '@/components/ui/ChipTabs';
import { RecordStatusBadge, GradeBadge } from '@/components/ui/StatusBadge';
import { formatActivityRegionLabel } from '@/data/korean-regions';
import { maskEmail } from '@/lib/avatar';
import { colors, gradients } from '@/theme/colors';
import { text } from '@/theme/text';
import { radius, shadow, spacing } from '@/theme/layout';
import { formatTimeAgo } from '@/lib/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppMenuSection from '@/components/home/AppMenuSection';
import { EmptyState } from '@/components/ui/States';
import { prefetchCatch } from '@/lib/prefetch';
import { useListBottomInset } from '@/lib/useTabInsets';

type CatchItem = {
  id: string;
  status: string;
  recordType: string;
  imageUrl?: string | null;
  locationName?: string;
  lengthCm?: number | null;
  createdAt: string;
  fishSpecies?: { nameKo?: string };
  certification?: { grade?: string };
};

type RecordTab = 'certified' | 'personal';
type SortMode = 'recent' | 'species';

export default function MyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [recordTab, setRecordTab] = useState<RecordTab>('certified');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const listBottom = useListBottomInset(spacing.xxl);

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data.data,
    enabled: !!user,
  });

  const { data, isPending } = useQuery({
    queryKey: ['catches', 'me'],
    queryFn: async () => {
      const res = await api.get('/catches/me', { params: { limit: 50 } });
      return res.data.data.items as CatchItem[];
    },
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const stats = meData?.stats;

  const filteredRecords = useMemo(() => {
    const items = (data ?? []).filter((c) =>
      recordTab === 'certified' ? c.recordType === 'certified' : c.recordType === 'personal',
    );
    if (sortMode === 'species') {
      return [...items].sort((a, b) =>
        (a.fishSpecies?.nameKo ?? '').localeCompare(b.fishSpecies?.nameKo ?? '', 'ko'),
      );
    }
    return [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [data, recordTab, sortMode]);

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  const listHeader = (
    <>
      {meData?.bio ? (
        <AppCard style={styles.bioCard}>
          <Text style={styles.bio}>{meData.bio}</Text>
        </AppCard>
      ) : null}

      <Pressable style={styles.bragBtn} onPress={() => router.push('/upload/personal')}>
        <Ionicons name="camera-outline" size={20} color={colors.brandGreen} />
        <Text style={styles.bragBtnText}>자랑 올리기</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>내 기록</Text>
      <View style={styles.recordControls}>
        <SegmentedTabs
          tabs={[
            { key: 'certified', label: '공식 기록' },
            { key: 'personal', label: '자랑 기록' },
          ]}
          active={recordTab}
          onChange={(v) => setRecordTab(v as RecordTab)}
        />
        <View style={styles.sortRow}>
          <Pressable
            style={[styles.sortChip, sortMode === 'recent' && styles.sortChipActive]}
            onPress={() => setSortMode('recent')}
          >
            <Text style={[styles.sortText, sortMode === 'recent' && styles.sortTextActive]}>최신순</Text>
          </Pressable>
          <Pressable
            style={[styles.sortChip, sortMode === 'species' && styles.sortChipActive]}
            onPress={() => setSortMode('species')}
          >
            <Text style={[styles.sortText, sortMode === 'species' && styles.sortTextActive]}>어종순</Text>
          </Pressable>
        </View>
      </View>
    </>
  );

  const listFooter = (
    <>
      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
        <Text style={styles.logoutText}>로그아웃</Text>
      </Pressable>
      <AppMenuSection />
    </>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...gradients.ocean]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.profile, { paddingTop: insets.top + spacing.md }]}
      >
        <View style={styles.profileTop}>
          <UserAvatar
            nickname={user?.nickname ?? '낚시인'}
            profileImage={meData?.profileImage}
            size={48}
            variant="dark"
            onPress={() => router.push('/my/edit')}
            showEditBadge
          />
          <View style={styles.profileInfo}>
            <Text style={styles.nickname}>{user?.nickname ?? '낚시인'}</Text>
            <View style={styles.metaLine}>
              {user?.email ? (
                <Text style={styles.email}>{maskEmail(user.email)}</Text>
              ) : null}
              {meData?.activityRegion ? (
                <>
                  <Text style={styles.dot}>·</Text>
                  <Ionicons name="location" size={11} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.region}>{formatActivityRegionLabel(meData.activityRegion)}</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        <Pressable style={styles.editBtn} onPress={() => router.push('/my/edit')}>
          <Ionicons name="create-outline" size={16} color="#fff" />
          <Text style={styles.editBtnText}>프로필 편집</Text>
        </Pressable>

        {user?.nickname ? (
          <Pressable
            style={styles.profileLinkRow}
            onPress={() => router.push(`/profile/${user.nickname}`)}
          >
            <Text style={styles.profileLink}>공개 프로필 보기</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.accentSky} />
          </Pressable>
        ) : null}
      </LinearGradient>

      {stats ? (
        <AppCard style={styles.statsCard}>
          <View style={styles.statsRow}>
            <StatPill label="인증" value={stats.certifiedCount ?? 0} />
            <StatPill label="자랑" value={stats.personalCount ?? 0} />
            <StatPill label="게시글" value={stats.postCount ?? 0} />
          </View>
        </AppCard>
      ) : null}

      {isPending && !data ? (
        <ActivityIndicator color={colors.brandGreen} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          style={styles.list}
          data={filteredRecords}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: listBottom }]}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={
            <EmptyState
              icon="fish-outline"
              title="아직 기록이 없어요"
              description={
                recordTab === 'certified'
                  ? '첫 인증에 도전해보세요!'
                  : '자랑 사진을 올려 보세요.'
              }
              actionLabel={recordTab === 'certified' ? '인증 촬영하기' : '자랑 올리기'}
              onAction={() =>
                router.push(recordTab === 'certified' ? '/(tabs)/capture' : '/upload/personal')
              }
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPressIn={() => void prefetchCatch(item.id)}
              onPress={() => router.push(`/catch/${item.id}`)}
            >
              <CatchThumb imageUrl={item.imageUrl} size={52} />
              <View style={styles.rowInfo}>
                <View style={styles.badgeRow}>
                  <RecordStatusBadge status={item.status} />
                  {item.certification?.grade ? (
                    <GradeBadge grade={item.certification.grade} />
                  ) : null}
                </View>
                <Text style={styles.rowTitle}>
                  {item.fishSpecies?.nameKo ?? '어종 미확인'} · {item.locationName ?? '장소 미입력'}
                </Text>
                <Text style={styles.rowDate}>{formatTimeAgo(item.createdAt)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { flex: 1 },
  profile: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileInfo: { flex: 1 },
  nickname: { ...text.bold(20), color: '#fff', letterSpacing: -0.3 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  email: { ...text.regular(12), color: 'rgba(255,255,255,0.82)' },
  dot: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  region: { ...text.regular(12), color: 'rgba(255,255,255,0.9)' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.22)',
    minHeight: 48,
  },
  editBtnText: { ...text.bold(14), color: '#fff' },
  profileLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.sm,
  },
  profileLink: { ...text.bold(13), color: colors.accentSky },
  statsCard: { marginHorizontal: spacing.lg, marginTop: -spacing.md, marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statPill: {
    flex: 1,
    backgroundColor: colors.sectionBg,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  statValue: { ...text.bold(18), color: colors.brandNavy },
  statLabel: { ...text.regular(11), color: colors.textMuted, marginTop: 2 },
  bioCard: { marginBottom: spacing.sm },
  bio: { ...text.regular(14), color: colors.textSub, lineHeight: 21 },
  bragBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.brandGreen,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  bragBtnText: { ...text.bold(15), color: colors.brandGreen },
  sectionTitle: {
    ...text.bold(16),
    color: colors.brandNavy,
    marginBottom: spacing.sm,
  },
  recordControls: { marginBottom: spacing.sm, gap: spacing.sm },
  sortRow: { flexDirection: 'row', gap: spacing.sm },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 32,
    justifyContent: 'center',
  },
  sortChipActive: { backgroundColor: colors.oceanLight, borderColor: colors.brandGreen },
  sortText: { ...text.regular(12), color: colors.textMuted },
  sortTextActive: { ...text.bold(12), color: colors.brandNavy },
  listContent: { paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    ...shadow.soft,
  },
  rowPressed: { backgroundColor: colors.pressed },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  rowInfo: { flex: 1 },
  rowTitle: { ...text.bold(14), color: colors.textPrimary },
  rowDate: { ...text.regular(11), color: colors.textMuted, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 48,
  },
  logoutText: { ...text.bold(14), color: colors.destructive },
});
