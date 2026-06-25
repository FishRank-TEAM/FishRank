import { Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { api } from '@/lib/api';
import Screen from '@/components/ui/Screen';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { colors } from '@/theme/colors';

export default function AdminReportsScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: async () => (await api.get('/admin/reports/flagged')).data.data.items,
  });

  return (
    <>
      <Stack.Screen options={{ title: '신고 관리' }} />
      <Screen scroll={false} padded={false}>
        {isLoading ? (
          <LoadingState />
        ) : (
          <FlatList
            data={data ?? []}
            keyExtractor={(item: { id: string }) => item.id}
            ListEmptyComponent={<EmptyState title="신고가 없습니다" />}
            renderItem={({ item }: { item: { targetType: string; reportCount: number } }) => (
              <Text style={styles.row}>
                {item.targetType} · 신고 {item.reportCount}건
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
