import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COMMUNITY_TAGS, type CommunitySort, type CommunityTagKey } from '@fishrank/shared';
import { colors } from '@/theme/colors';
import { text } from '@/theme/text';
import { radius, spacing } from '@/theme/layout';

const TAG_TABS = [
  { key: '', label: '전체' },
  ...COMMUNITY_TAGS.map((t) => ({ key: t.key, label: t.label })),
];

const SORT_TABS = [
  { key: 'latest', label: '최신순' },
  { key: 'popular', label: '인기순' },
] as const;

type Props = {
  sort: CommunitySort;
  onSortChange: (sort: CommunitySort) => void;
  tag: CommunityTagKey | '';
  onTagChange: (tag: CommunityTagKey | '') => void;
  search: string;
  onSearchChange: (q: string) => void;
};

/** 커뮤니티 검색 · 정렬 · 태그 — 컴팩트 툴바 */
export default function CommunityFilterBar({
  sort,
  onSortChange,
  tag,
  onTagChange,
  search,
  onSearchChange,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={15} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="제목·내용 검색"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={onSearchChange}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {search.length > 0 ? (
          <Pressable
            onPress={() => onSearchChange('')}
            hitSlop={8}
            accessibilityLabel="검색어 지우기"
          >
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.toolbar}>
        <View style={styles.sortRow}>
          {SORT_TABS.map((tab) => {
            const isActive = sort === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.sortChip, isActive && styles.sortChipActive]}
                onPress={() => onSortChange(tab.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.sortText, isActive && styles.sortTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagRow}
      >
        {TAG_TABS.map((tab) => {
          const isActive = tag === tab.key;
          return (
            <Pressable
              key={tab.key || 'all'}
              style={[styles.tagChip, isActive && styles.tagChipActive]}
              onPress={() => onTagChange(tab.key as CommunityTagKey | '')}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.tagText, isActive && styles.tagTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    ...text.regular(13),
    color: colors.textPrimary,
    paddingVertical: 6,
    padding: 0,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortChip: {
    minHeight: 26,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: {
    backgroundColor: colors.brandNavy,
    borderColor: colors.brandNavy,
  },
  sortText: {
    ...text.regular(11),
    color: colors.textSub,
  },
  sortTextActive: {
    ...text.bold(11),
    color: '#fff',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.sm,
  },
  tagChip: {
    minHeight: 26,
    paddingHorizontal: 10,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipActive: {
    backgroundColor: colors.brandGreen,
    borderColor: colors.brandGreen,
  },
  tagText: {
    ...text.regular(11),
    color: colors.textSub,
  },
  tagTextActive: {
    ...text.bold(11),
    color: '#fff',
  },
});
