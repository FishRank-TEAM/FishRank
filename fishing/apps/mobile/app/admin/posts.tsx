import { Text, FlatList, StyleSheet, Pressable, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { api } from '@/lib/api';
import Screen from '@/components/ui/Screen';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { formatTimeAgo } from '@/lib/format';
import { colors } from '@/theme/colors';

export default function AdminPostsScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'posts'],
    queryFn: async () => (await api.get('/admin/posts', { params: { limit: 30 } })).data.data.items,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] });
      Alert.alert('삭제 완료', '게시글이 삭제되었습니다.');
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: '게시글 관리' }} />
      <Screen scroll={false} padded={false}>
        {isLoading ? (
          <LoadingState />
        ) : (
          <FlatList
            data={data ?? []}
            keyExtractor={(item: { id: string }) => item.id}
            ListEmptyComponent={<EmptyState title="게시글이 없습니다" />}
            renderItem={({ item }: { item: { id: string; title: string; user?: { nickname: string }; createdAt: string } }) => (
              <Pressable
                style={styles.row}
                onPress={() =>
                  Alert.alert(item.title, `${item.user?.nickname ?? '-'} · ${formatTimeAgo(item.createdAt)}`, [
                    { text: '취소', style: 'cancel' },
                    { text: '삭제', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                  ])
                }
              >
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>{item.user?.nickname} · {formatTimeAgo(item.createdAt)}</Text>
              </Pressable>
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
  row: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
