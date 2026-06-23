import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { api } from '@/lib/api';

type RankingRow = {
  rank: number;
  nickname: string;
  speciesName?: string;
  lengthCm?: number;
  regionName?: string;
};

export default function RankingScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['rankings', 'official', 'weekly'],
    queryFn: async () => {
      const res = await api.get('/rankings', {
        params: { periodType: 'weekly', limit: 30, rankingType: 'official' },
      });
      return res.data.data.rankings as RankingRow[];
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#48cae4" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={data ?? []}
      keyExtractor={(item, i) => `${item.rank}-${item.nickname}-${i}`}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#48cae4" />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.headerTitle}>공식 주간 랭킹</Text>
          <Text style={styles.headerSub}>앱 AR+AI 실시간 촬영 인증만 반영</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.rank}>{item.rank}</Text>
          <View style={styles.info}>
            <Text style={styles.nickname}>{item.nickname}</Text>
            <Text style={styles.meta}>
              {[item.speciesName, item.lengthCm ? `${item.lengthCm}cm` : null, item.regionName]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>랭킹 데이터가 없습니다.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f9ff' },
  list: { flex: 1, backgroundColor: '#f0f9ff' },
  header: { padding: 16, backgroundColor: '#003d6b' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  rank: { width: 36, fontSize: 18, fontWeight: '800', color: '#003d6b' },
  info: { flex: 1 },
  nickname: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  empty: { textAlign: 'center', padding: 32, color: '#64748b' },
});
