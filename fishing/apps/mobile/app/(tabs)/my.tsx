import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

type CatchItem = {
  id: string;
  status: string;
  recordType: string;
  locationName?: string;
  createdAt: string;
  certification?: { grade?: string };
};

export default function MyScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const { data, isLoading } = useQuery({
    queryKey: ['catches', 'me'],
    queryFn: async () => {
      const res = await api.get('/catches/me', { params: { limit: 30 } });
      return res.data.data.items as CatchItem[];
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.profile}>
        <Text style={styles.nickname}>{user?.nickname ?? '낚시인'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>내 기록</Text>
      {isLoading ? (
        <ActivityIndicator color="#48cae4" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.badge}>
                {item.recordType === 'certified' ? '공식' : '자랑'}
              </Text>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>
                  {item.locationName ?? '장소 미입력'} · {item.status}
                </Text>
                {item.certification?.grade ? (
                  <Text style={styles.grade}>등급 {item.certification.grade}</Text>
                ) : null}
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>기록이 없습니다.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  profile: {
    backgroundColor: '#003d6b',
    padding: 20,
    paddingTop: 8,
  },
  nickname: { color: '#fff', fontSize: 22, fontWeight: '800' },
  email: { color: '#94a3b8', marginTop: 4 },
  logoutBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#48cae4',
    borderRadius: 6,
  },
  logoutText: { color: '#48cae4', fontSize: 13 },
  sectionTitle: {
    padding: 16,
    fontSize: 16,
    fontWeight: '700',
    color: '#003d6b',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 10,
  },
  badge: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 14, color: '#0f172a' },
  grade: { fontSize: 12, color: '#64748b', marginTop: 2 },
  empty: { textAlign: 'center', padding: 32, color: '#64748b' },
});
