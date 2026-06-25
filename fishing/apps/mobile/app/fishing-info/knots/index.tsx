import { useState, useMemo } from 'react';
import { Text, FlatList, StyleSheet, Pressable, TextInput } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import Screen from '@/components/ui/Screen';
import ChipTabs from '@/components/ui/ChipTabs';
import { KNOTS, KNOT_CATEGORIES, KNOT_DIFFICULTY_LABEL } from '@/data/knots';
import { colors } from '@/theme/colors';

export default function KnotsListScreen() {
  const router = useRouter();
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return KNOTS.filter((k) => {
      if (category !== 'all' && k.category !== category) return false;
      if (query && !k.nameKo.includes(query) && !k.nameEn.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [category, query]);

  return (
    <>
      <Stack.Screen options={{ title: '매듭 가이드' }} />
      <Screen scroll={false} padded={false}>
        <TextInput
          style={styles.search}
          placeholder="매듭 검색"
          value={query}
          onChangeText={setQuery}
        />
        <ChipTabs
          tabs={KNOT_CATEGORIES.map((c) => ({ key: c.key, label: c.label }))}
          active={category}
          onChange={setCategory}
        />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.slug}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/fishing-info/knots/${item.slug}`)}
            >
              <Text style={styles.name}>{item.nameKo}</Text>
              <Text style={styles.meta}>{KNOT_DIFFICULTY_LABEL[item.difficulty]}</Text>
            </Pressable>
          )}
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
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
