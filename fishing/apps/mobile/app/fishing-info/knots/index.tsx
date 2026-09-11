import { useState, useMemo } from 'react';
import { Text, FlatList, StyleSheet, Pressable, TextInput, View } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import Screen from '@/components/ui/Screen';
import ChipTabs from '@/components/ui/ChipTabs';
import { EmptyState } from '@/components/ui/States';
import {
  KNOTS,
  KNOT_CATEGORIES,
  KNOT_CATEGORY_LABEL,
  KNOT_DIFFICULTY_LABEL,
  KNOTS_DISCLAIMER,
  filterKnots,
  sortKnots,
  type KnotCategory,
} from '@/data/knots';
import { colors } from '@/theme/colors';

export default function KnotsListScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<KnotCategory | 'all'>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => sortKnots(filterKnots(KNOTS, { category, query }), 'difficulty-asc'),
    [category, query],
  );

  return (
    <>
      <Stack.Screen options={{ title: '매듭 가이드' }} />
      <Screen scroll={false} padded={false}>
        <TextInput
          style={styles.search}
          placeholder="매듭 이름·용도 검색"
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="매듭 검색"
        />
        <View style={styles.chips}>
          <ChipTabs
            tabs={KNOT_CATEGORIES.map((c) => ({ key: c.key, label: c.label }))}
            active={category}
            onChange={(key) => setCategory(key as KnotCategory | 'all')}
          />
        </View>
        <Text style={styles.count}>{filtered.length}개 매듭</Text>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.slug}
          ListEmptyComponent={
            <EmptyState icon="link-outline" title="검색 결과가 없습니다" />
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/fishing-info/knots/${item.slug}`)}
              accessibilityRole="button"
              accessibilityLabel={`${item.nameKo}, ${KNOT_DIFFICULTY_LABEL[item.difficulty]}`}
            >
              <Text style={styles.icon}>{item.icon}</Text>
              <View style={styles.body}>
                <Text style={styles.name}>{item.nameKo}</Text>
                <Text style={styles.en}>{item.nameEn}</Text>
                <Text style={styles.summary} numberOfLines={2}>
                  {item.summary}
                </Text>
                <Text style={styles.meta}>
                  {KNOT_DIFFICULTY_LABEL[item.difficulty]} · {KNOT_CATEGORY_LABEL[item.category]}
                  {item.strength ? ` · ${item.strength}` : ''}
                </Text>
              </View>
            </Pressable>
          )}
          ListFooterComponent={<Text style={styles.disclaimer}>{KNOTS_DISCLAIMER}</Text>}
          contentContainerStyle={styles.list}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.surface,
  },
  chips: { paddingHorizontal: 16 },
  count: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 12,
    color: colors.textMuted,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  icon: { fontSize: 28, lineHeight: 36 },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  en: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  summary: { fontSize: 12, color: colors.textSub, marginTop: 4, lineHeight: 18 },
  meta: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  disclaimer: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
