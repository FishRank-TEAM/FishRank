import { Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { api } from '@/lib/api';
import Screen from '@/components/ui/Screen';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { formatTimeAgo } from '@/lib/format';
import { colors } from '@/theme/colors';

type Announcement = {
  id: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
  isPinned?: boolean;
};

export default function AnnouncementsScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await api.get('/announcements', { params: { limit: 30 } });
      return res.data.data as Announcement[];
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: '공지 · 이벤트' }} />
      <Screen scroll={false} padded={false}>
        {isLoading ? (
          <LoadingState />
        ) : (
          <FlatList
            data={data ?? []}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<EmptyState icon="megaphone-outline" title="공지가 없습니다" />}
            renderItem={({ item }) => (
              <Text style={styles.card}>
                <Text style={styles.badge}>{item.type === 'event' ? '이벤트' : '공지'}</Text>
                {'\n'}
                <Text style={styles.title}>{item.title}</Text>
                {'\n'}
                <Text style={styles.body}>{item.content}</Text>
                {'\n'}
                <Text style={styles.date}>{formatTimeAgo(item.createdAt)}</Text>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  badge: { fontSize: 11, fontWeight: '700', color: colors.oceanBright },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
  body: { fontSize: 14, color: colors.textSub, marginTop: 6 },
  date: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
});
