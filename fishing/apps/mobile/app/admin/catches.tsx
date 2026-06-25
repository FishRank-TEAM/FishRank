import { View, Text, FlatList, StyleSheet, Pressable, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { api } from '@/lib/api';
import Screen from '@/components/ui/Screen';
import CatchThumb from '@/components/CatchThumb';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { formatLength } from '@/lib/format';
import { colors } from '@/theme/colors';

type CatchRow = {
  id: string;
  status: string;
  imageUrl?: string;
  lengthCm?: number;
  user?: { nickname: string };
  fishSpecies?: { nameKo?: string };
};

export default function AdminCatchesScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'catches'],
    queryFn: async () =>
      (await api.get('/admin/catches', { params: { status: 'pending', limit: 30 } })).data.data
        .items as CatchRow[],
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      api.patch(`/admin/catches/${id}/review`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'catches'] });
      Alert.alert('처리 완료', '기록 검토가 반영되었습니다.');
    },
    onError: () => Alert.alert('실패', '검토 처리에 실패했습니다.'),
  });

  return (
    <>
      <Stack.Screen options={{ title: '기록 검토' }} />
      <Screen scroll={false} padded={false}>
        {isLoading ? (
          <LoadingState />
        ) : (
          <FlatList
            data={data ?? []}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<EmptyState title="검토할 기록이 없습니다" />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.rowTop}>
                  <CatchThumb imageUrl={item.imageUrl} size={64} />
                  <View style={styles.info}>
                    <Text style={styles.nickname}>{item.user?.nickname ?? '-'}</Text>
                    <Text style={styles.meta}>
                      {item.fishSpecies?.nameKo ?? '-'} · {formatLength(item.lengthCm)}
                    </Text>
                    <Text style={styles.status}>{item.status}</Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    style={styles.rejectBtn}
                    disabled={reviewMutation.isPending}
                    onPress={() =>
                      Alert.alert('반려', '이 기록을 반려할까요?', [
                        { text: '취소', style: 'cancel' },
                        {
                          text: '반려',
                          style: 'destructive',
                          onPress: () => reviewMutation.mutate({ id: item.id, status: 'rejected' }),
                        },
                      ])
                    }
                  >
                    <Text style={styles.rejectText}>반려</Text>
                  </Pressable>
                  <Pressable
                    style={styles.approveBtn}
                    disabled={reviewMutation.isPending}
                    onPress={() => reviewMutation.mutate({ id: item.id, status: 'approved' })}
                  >
                    <Text style={styles.approveText}>승인</Text>
                  </Pressable>
                </View>
              </View>
            )}
            contentContainerStyle={styles.list}
          />
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  rowTop: { flexDirection: 'row', gap: 12 },
  info: { flex: 1 },
  nickname: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 13, color: colors.textSub, marginTop: 4 },
  status: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  rejectText: { color: colors.error, fontWeight: '700' },
  approveBtn: {
    flex: 1,
    backgroundColor: colors.oceanBright,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  approveText: { color: '#fff', fontWeight: '700' },
});
