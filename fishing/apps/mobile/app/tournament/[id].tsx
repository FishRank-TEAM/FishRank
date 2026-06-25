import { Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, Stack } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import Screen from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/States';
import { colors } from '@/theme/colors';

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tournament', id],
    queryFn: async () => (await api.get(`/tournaments/${id}`)).data.data,
    enabled: !!id,
  });

  const { data: ranking } = useQuery({
    queryKey: ['tournament-ranking', id],
    queryFn: async () => (await api.get(`/tournaments/${id}/ranking`)).data.data,
    enabled: !!id,
  });

  const joinMutation = useMutation({
    mutationFn: async () => (await api.post(`/tournaments/${id}/join`)).data,
    onSuccess: () => {
      Alert.alert('참가 완료', '대회에 참가했습니다.');
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('참가 실패', typeof msg === 'string' ? msg : '참가에 실패했습니다.');
    },
  });

  if (isLoading || !data) return <LoadingState />;

  return (
    <>
      <Stack.Screen options={{ title: data.title }} />
      <Screen>
        <Text style={styles.desc}>{data.description}</Text>
        <Text style={styles.meta}>
          기간: {new Date(data.startAt).toLocaleDateString('ko-KR')} ~{' '}
          {new Date(data.endAt).toLocaleDateString('ko-KR')}
        </Text>
        {data.prizeAmount ? (
          <Text style={styles.meta}>상금: {data.prizeAmount.toLocaleString()}원</Text>
        ) : data.prize ? (
          <Text style={styles.meta}>상금: {data.prize}</Text>
        ) : null}

        {isLoggedIn && data.status === 'active' ? (
          <Pressable style={styles.btn} onPress={() => joinMutation.mutate()}>
            <Text style={styles.btnText}>대회 참가</Text>
          </Pressable>
        ) : null}

        <Text style={styles.section}>실시간 순위</Text>
        {(Array.isArray(ranking) ? ranking : []).slice(0, 10).map(
          (r: { rank: number; user?: { nickname: string }; bestLengthCm?: number }) => (
          <Text key={r.rank} style={styles.rankRow}>
            {r.rank}. {r.user?.nickname ?? '-'}
            {r.bestLengthCm != null ? ` · ${r.bestLengthCm}cm` : ''}
          </Text>
        ))}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  desc: { fontSize: 15, lineHeight: 22, color: colors.textPrimary, marginBottom: 12 },
  meta: { fontSize: 13, color: colors.textSub, marginBottom: 4 },
  btn: {
    backgroundColor: colors.oceanBright,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginVertical: 16,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  section: { fontSize: 16, fontWeight: '800', color: colors.oceanDeep, marginTop: 8, marginBottom: 8 },
  rankRow: {
    padding: 10,
    backgroundColor: colors.surface,
    borderRadius: 6,
    marginBottom: 6,
    fontSize: 14,
    color: colors.textPrimary,
  },
});
