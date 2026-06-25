import { Text, StyleSheet, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, Stack } from 'expo-router';
import { api } from '@/lib/api';
import Screen from '@/components/ui/Screen';
import MenuRow from '@/components/ui/MenuRow';
import { LoadingState } from '@/components/ui/States';
import { colors } from '@/theme/colors';

export default function AdminScreen() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => (await api.get('/admin/stats')).data.data,
  });

  if (isLoading) return <LoadingState />;

  return (
    <>
      <Stack.Screen options={{ title: '관리자' }} />
      <Screen>
        <Text style={styles.title}>대시보드</Text>
        <Text style={styles.stat}>사용자: {data?.totalUsers ?? 0}</Text>
        <Text style={styles.stat}>기록: {data?.totalCatches ?? 0}</Text>
        <Text style={styles.stat}>게시글: {data?.totalPosts ?? 0}</Text>
        <Text style={styles.stat}>검수 대기: {data?.pendingCatches ?? 0}</Text>
        <Text style={styles.stat}>신고 대기: {data?.flaggedReports ?? 0}</Text>

        <MenuRow icon="🚩" title="신고 관리" onPress={() => router.push('/admin/reports')} />
        <MenuRow icon="📋" title="기록 검토" onPress={() => router.push('/admin/catches')} />
        <MenuRow icon="📢" title="공지 관리" onPress={() => router.push('/admin/announcements')} />
        <MenuRow icon="📝" title="게시글 관리" onPress={() => router.push('/admin/posts')} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', color: colors.oceanDeep, marginBottom: 12 },
  stat: { fontSize: 14, color: colors.textPrimary, marginBottom: 6 },
});
