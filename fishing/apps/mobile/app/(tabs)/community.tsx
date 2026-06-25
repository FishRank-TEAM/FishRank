import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { CommunitySort, CommunityTagKey } from '@fishrank/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import PageHeader from '@/components/PageHeader';
import UserAvatar from '@/components/ui/UserAvatar';
import CommunityFilterBar from '@/components/community/CommunityFilterBar';
import PostTagBadges from '@/components/community/PostTagBadges';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { getImageUrl } from '@/lib/images';
import { formatTimeAgo } from '@/lib/format';
import { useListBottomInsetWithFab, useTabBarHeight } from '@/lib/useTabInsets';
import { colors } from '@/theme/colors';
import { text } from '@/theme/text';
import { radius, shadow, spacing } from '@/theme/layout';
import { prefetchPost } from '@/lib/prefetch';

type Post = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  tags?: string[];
  createdAt: string;
  viewCount: number;
  user: { nickname: string; profileImage?: string | null };
  _count?: { comments: number };
};

export default function CommunityTab() {
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [sort, setSort] = useState<CommunitySort>('latest');
  const [tag, setTag] = useState<CommunityTagKey | ''>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const listBottom = useListBottomInsetWithFab();
  const tabBarHeight = useTabBarHeight();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isPending, refetch, isRefetching } = useQuery({
    queryKey: ['posts', sort, tag, debouncedSearch],
    queryFn: async () => {
      const res = await api.get('/posts', {
        params: {
          limit: 30,
          sort,
          ...(tag ? { tag } : {}),
          ...(debouncedSearch ? { q: debouncedSearch } : {}),
        },
      });
      const payload = res.data.data;
      return (payload?.items ?? payload ?? []) as Post[];
    },
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const posts = data ?? [];
  const showInitialLoad = isPending && !data;

  return (
    <View style={styles.wrap}>
      <PageHeader title="커뮤니티" variant="compact" />
      <CommunityFilterBar
        sort={sort}
        onSortChange={setSort}
        tag={tag}
        onTagChange={setTag}
        search={search}
        onSearchChange={setSearch}
      />
      <FlatList
        style={styles.list}
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandGreen} />
        }
        ListEmptyComponent={
          showInitialLoad ? (
            <LoadingState />
          ) : (
            <EmptyState
              icon="chatbubble-outline"
              title={
                debouncedSearch
                  ? '검색 결과가 없어요'
                  : tag
                    ? '해당 태그의 글이 없어요'
                    : '아직 게시글이 없어요'
              }
              description={
                debouncedSearch
                  ? '다른 검색어로 다시 찾아보세요.'
                  : '첫 포인트 이야기를 남겨 보세요.'
              }
            />
          )
        }
        renderItem={({ item }) => {
          const thumb = getImageUrl(item.imageUrl);
          const comments = item._count?.comments ?? 0;
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPressIn={() => void prefetchPost(item.id)}
              onPress={() => router.push(`/community/${item.id}`)}
            >
              <View style={styles.rowHeader}>
                <UserAvatar nickname={item.user.nickname} profileImage={item.user.profileImage} size={36} />
                <View style={styles.authorBlock}>
                  <Text style={styles.author}>{item.user.nickname}</Text>
                  <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
                </View>
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              {item.tags?.length ? (
                <View style={styles.tagRow}>
                  <PostTagBadges tags={item.tags} />
                </View>
              ) : null}
              <Text style={styles.preview} numberOfLines={2}>
                {item.content}
              </Text>
              {thumb ? (
                <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
              ) : null}
              <View style={styles.metaRow}>
                <Ionicons name="chatbubble-outline" size={13} color={colors.textMuted} />
                <Text style={styles.meta}>댓글 {comments}</Text>
                <Text style={styles.metaDot}>·</Text>
                <Ionicons name="eye-outline" size={13} color={colors.textMuted} />
                <Text style={styles.meta}>조회 {item.viewCount}</Text>
                {comments === 0 ? (
                  <>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.firstComment}>첫 댓글 남기기</Text>
                  </>
                ) : null}
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={[styles.listContent, { paddingBottom: listBottom }]}
      />
      {isLoggedIn ? (
        <Pressable
          style={[styles.fab, { bottom: tabBarHeight + spacing.md }]}
          onPress={() => router.push('/community/write')}
          accessibilityLabel="글쓰기"
        >
          <Ionicons name="create" size={24} color="#fff" />
        </Pressable>
      ) : (
        <Pressable
          style={[styles.fab, { bottom: tabBarHeight + spacing.md }]}
          onPress={() => router.push('/(auth)/login')}
          accessibilityLabel="로그인"
        >
          <Ionicons name="log-in" size={22} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.soft,
  },
  cardPressed: { backgroundColor: colors.pressed },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  authorBlock: { flex: 1, minWidth: 0 },
  author: { ...text.bold(13), color: colors.brandNavy },
  time: { ...text.regular(11), color: colors.textMuted, marginTop: 1 },
  title: { ...text.bold(16), color: colors.textPrimary, marginBottom: 6 },
  tagRow: { marginBottom: 6 },
  preview: { ...text.regular(14), color: colors.textSub, lineHeight: 20 },
  thumb: { width: '100%', height: 140, borderRadius: radius.sm, marginTop: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm, flexWrap: 'wrap' },
  meta: { ...text.regular(12), color: colors.textMuted },
  metaDot: { ...text.regular(12), color: colors.textMuted },
  firstComment: { ...text.regular(12), color: colors.brandGreen },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
});
