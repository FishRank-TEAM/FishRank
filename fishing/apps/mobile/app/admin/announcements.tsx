import { Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { api } from '@/lib/api';
import Screen from '@/components/ui/Screen';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { colors } from '@/theme/colors';

export default function AdminAnnouncementsScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'announcements'],
    queryFn: async () => (await api.get('/admin/announcements')).data.data.items,
  });

  return (
    <>
      <Stack.Screen options={{ title: '공지 관리' }} />
      <Screen scroll={false} padded={false}>
        {isLoading ? (
          <LoadingState />
        ) : (
          <FlatList
            data={data ?? []}
            keyExtractor={(item: { id: string }) => item.id}
            ListEmptyComponent={<EmptyState title="공지가 없습니다" />}
            renderItem={({ item }: { item: { title: string; isPublished: boolean } }) => (
              <Text style={styles.row}>
                {item.title} {item.isPublished ? '(게시)' : '(미게시)'}
              </Text>
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
    fontSize: 14,
    color: colors.textPrimary,
  },
});
