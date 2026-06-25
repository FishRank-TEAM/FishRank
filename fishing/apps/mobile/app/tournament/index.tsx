import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, Stack } from 'expo-router';
import { api } from '@/lib/api';
import Screen from '@/components/ui/Screen';
import ChipTabs from '@/components/ui/ChipTabs';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { colors } from '@/theme/colors';

type Tournament = {
  id: string;
  title: string;
  status: string;
  category: string;
  startAt: string;
  endAt: string;
  prizeAmount?: number;
};

const STATUS: Record<string, string> = {
  upcoming: '예정',
  active: '진행중',
  closed: '마감',
  finished: '종료',
};

export default function TournamentListScreen() {
  const router = useRouter();
  const [category, setCategory] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['tournaments', category],
    queryFn: async () => {
      const res = await api.get('/tournaments', { params: { category } });
      return res.data.data as Tournament[];
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: '낚시 대회' }} />
      <Screen scroll={false} padded={false}>
        <View style={styles.filters}>
          <ChipTabs
          tabs={[
            { key: 'all', label: '전체' },
            { key: 'freshwater', label: '민물' },
            { key: 'saltwater', label: '바다' },
          ]}
          active={category}
          onChange={setCategory}
        />
        </View>
        {isLoading ? (
          <LoadingState />
        ) : (
          <FlatList
            data={data ?? []}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<EmptyState icon="trophy-outline" title="대회가 없습니다" />}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => router.push(`/tournament/${item.id}`)}>
                <Text style={styles.badge}>{STATUS[item.status] ?? item.status}</Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>
                  {new Date(item.startAt).toLocaleDateString('ko-KR')} ~{' '}
                  {new Date(item.endAt).toLocaleDateString('ko-KR')}
                </Text>
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
  filters: { paddingHorizontal: 16, paddingTop: 8 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  badge: { fontSize: 11, fontWeight: '700', color: colors.oceanBright, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
});
