import { useState } from 'react';
import { Text, FlatList, StyleSheet, Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, Stack } from 'expo-router';
import { api } from '@/lib/api';
import Screen from '@/components/ui/Screen';
import ChipTabs from '@/components/ui/ChipTabs';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { FISH_CATEGORY_FILTER_TABS, getFishCategoryLabel } from '@fishrank/shared';
import { colors } from '@/theme/colors';
import { useAuthStore } from '@/store/auth.store';
import Button from '@/components/ui/Button';

type Item = {
  id: number;
  fishSpeciesId: number;
  nameKo: string;
  category: string;
  season?: string;
  bait?: string;
};

export default function EncyclopediaScreen() {
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [category, setCategory] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['encyclopedia', category],
    queryFn: async () => {
      const res = await api.get('/encyclopedia', {
        params: { category: category === 'all' ? undefined : category, limit: 50 },
      });
      return res.data.data.items as Item[];
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: '어종 사전' }} />
      <Screen scroll={false} padded={false}>
        {isLoggedIn && (
          <View style={styles.addWrap}>
            <Button
              label="+ 어종 추가"
              variant="secondary"
              onPress={() => router.push('/encyclopedia/new')}
            />
          </View>
        )}
        <ChipTabs
          tabs={[...FISH_CATEGORY_FILTER_TABS]}
          active={category}
          onChange={setCategory}
        />
        {isLoading ? (
          <LoadingState />
        ) : (
          <FlatList
            data={data ?? []}
            keyExtractor={(item) => String(item.fishSpeciesId)}
            ListEmptyComponent={<EmptyState icon="fish-outline" title="어종이 없습니다" />}
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => router.push(`/encyclopedia/${item.fishSpeciesId}`)}
              >
                <Text style={styles.name}>{item.nameKo}</Text>
                <Text style={styles.meta}>
                  {getFishCategoryLabel(item.category)}
                  {item.season ? ` · ${item.season}` : ''}
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
  addWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  list: { paddingTop: 8, paddingHorizontal: 16 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  name: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
