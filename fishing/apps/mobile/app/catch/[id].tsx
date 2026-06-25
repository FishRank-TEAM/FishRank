import { View, Image, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import Screen from '@/components/ui/Screen';
import { ErrorState } from '@/components/ui/States';
import { CatchDetailSkeleton } from '@/components/ui/Skeleton';
import CatchThumb from '@/components/CatchThumb';
import { RecordStatusBadge, GradeBadge } from '@/components/ui/StatusBadge';
import { getImageUrl } from '@/lib/images';
import { formatLength, formatTimeAgo } from '@/lib/format';
import { colors } from '@/theme/colors';
import { text } from '@/theme/text';
import { radius, spacing } from '@/theme/layout';

export default function CatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['catch', id],
    queryFn: async () => (await api.get(`/catches/${id}`)).data.data,
    enabled: !!id,
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });

  if (isPending && !data) {
    return (
      <>
        <Stack.Screen options={{ title: '기록 상세' }} />
        <Screen>
          <CatchDetailSkeleton />
        </Screen>
      </>
    );
  }

  if (isError || !data) {
    return (
      <>
        <Stack.Screen options={{ title: '기록 상세' }} />
        <ErrorState title="기록을 불러올 수 없습니다" onRetry={refetch} />
      </>
    );
  }

  const imageUri = getImageUrl(data.imageUrl);
  const isRejected = data.status === 'rejected';
  const rejectReason =
    data.certification?.errorMessage ??
    (isRejected ? '인증 기준이 충족되지 않아 반려되었습니다.' : null);

  return (
    <>
      <Stack.Screen options={{ title: '기록 상세' }} />
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.hero} resizeMode="cover" accessibilityLabel="업로드한 낚시 사진" />
          ) : (
            <CatchThumb imageUrl={null} size={200} style={styles.heroPlaceholder} />
          )}

          <View style={styles.badges}>
            <Text style={styles.badge}>{data.recordType === 'certified' ? '공식 인증' : '자랑'}</Text>
            <RecordStatusBadge status={data.status} />
            {data.certification?.grade ? <GradeBadge grade={data.certification.grade} /> : null}
          </View>

          {isRejected && rejectReason ? (
            <View style={styles.rejectBox}>
              <Text style={styles.rejectTitle}>거절 사유</Text>
              <Text style={styles.rejectText}>{rejectReason}</Text>
              {data.recordType === 'certified' ? (
                <Pressable style={styles.retryBtn} onPress={() => router.push('/(tabs)/capture')}>
                  <Text style={styles.retryBtnText}>다시 인증 촬영</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <Pressable onPress={() => router.push(`/profile/${data.user?.nickname}`)}>
            <Text style={styles.nickname}>{data.user?.nickname ?? '-'}</Text>
          </Pressable>
          <Text style={styles.meta}>{formatTimeAgo(data.createdAt)}</Text>

          <InfoRow label="어종" value={data.fishSpecies?.nameKo ?? '-'} />
          <InfoRow label="체장" value={formatLength(data.lengthCm)} />
          <InfoRow label="장소" value={data.locationName ?? '미입력'} />
          {data.memo ? <InfoRow label="메모" value={data.memo} /> : null}

          {data.recordType === 'personal' ? (
            <Pressable
              style={styles.voteBtn}
              onPress={async () => {
                try {
                  await api.post(`/catches/${id}/vote`);
                  Alert.alert('추천 완료', '자랑 기록에 추천했습니다.');
                } catch {
                  Alert.alert('추천 실패', '이미 추천했거나 실패했습니다.');
                }
              }}
            >
              <Text style={styles.voteBtnText}>👍 추천하기</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </Screen>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl },
  hero: { width: '100%', height: 280, borderRadius: radius.md, marginBottom: spacing.md },
  heroPlaceholder: { width: '100%', height: 200, marginBottom: spacing.md },
  badges: { flexDirection: 'row', gap: 8, marginBottom: spacing.md, flexWrap: 'wrap', alignItems: 'center' },
  badge: {
    backgroundColor: colors.badgeBg,
    color: colors.badgeText,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  rejectBox: {
    backgroundColor: '#ffebee',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#ffcdd2',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rejectTitle: { ...text.bold(12), color: '#b71c1c', marginBottom: 4 },
  rejectText: { ...text.regular(13), color: '#c62828', lineHeight: 20 },
  retryBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.brandNavy,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  retryBtnText: { ...text.bold(13), color: '#fff' },
  nickname: { ...text.bold(20), color: colors.brandNavy },
  meta: { ...text.regular(12), color: colors.textMuted, marginBottom: spacing.md },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { width: 56, ...text.bold(13), color: colors.textMuted },
  infoValue: { flex: 1, ...text.regular(14), color: colors.textPrimary },
  voteBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.brandGreen,
    borderRadius: radius.sm,
    padding: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  voteBtnText: { ...text.bold(15), color: '#fff' },
});
