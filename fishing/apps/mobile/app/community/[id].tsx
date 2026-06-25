import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, Image, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import Screen from '@/components/ui/Screen';
import UserAvatar from '@/components/ui/UserAvatar';
import AppCard from '@/components/ui/AppCard';
import { CatchDetailSkeleton } from '@/components/ui/Skeleton';
import { getImageUrl } from '@/lib/images';
import { formatTimeAgo } from '@/lib/format';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { radius, shadow, spacing } from '@/theme/layout';

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const { data, isPending } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => (await api.get(`/posts/${id}`)).data.data,
    enabled: !!id,
    staleTime: 3 * 60_000,
    placeholderData: (prev) => prev,
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) =>
      (await api.post(`/posts/${id}/comments`, { content })).data,
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['post', id] });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () =>
      api.patch(`/posts/${id}`, { title: editTitle.trim(), content: editContent.trim() }),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      Alert.alert('수정 완료', '글이 수정되었습니다.');
    },
    onError: () => Alert.alert('수정 실패', '글 수정에 실패했습니다.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/posts/${id}`),
    onSuccess: () => {
      Alert.alert('삭제 완료', '글이 삭제되었습니다.');
      router.replace('/(tabs)/community');
    },
  });

  if (isPending && !data) {
    return (
      <>
        <Stack.Screen options={{ title: '글 상세' }} />
        <Screen>
          <CatchDetailSkeleton />
        </Screen>
      </>
    );
  }

  if (!data) return null;

  const isOwner = user?.id === data.userId || user?.nickname === data.user?.nickname;
  const imageUri = getImageUrl(data.imageUrl);

  return (
    <>
      <Stack.Screen options={{ title: '글 상세' }} />
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {editing ? (
          <>
            <TextInput style={styles.input} value={editTitle} onChangeText={setEditTitle} />
            <TextInput
              style={[styles.input, styles.bodyInput]}
              value={editContent}
              onChangeText={setEditContent}
              multiline
            />
            <View style={styles.ownerActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text>취소</Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={() => editMutation.mutate()}>
                <Text style={styles.btnText}>저장</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <AppCard style={styles.postCard}>
            <View style={styles.authorRow}>
              <UserAvatar
                nickname={data.user?.nickname ?? '?'}
                profileImage={data.user?.profileImage}
                size={40}
              />
              <View>
                <Text style={styles.authorName}>{data.user?.nickname}</Text>
                <Text style={styles.meta}>{formatTimeAgo(data.createdAt)}</Text>
              </View>
            </View>
            <Text style={styles.title}>{data.title}</Text>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.postImage} resizeMode="cover" />
            ) : null}
            <Text style={styles.body}>{data.content}</Text>
            {isOwner ? (
              <View style={styles.ownerActions}>
                <Pressable
                  style={styles.editBtn}
                  onPress={() => {
                    setEditTitle(data.title);
                    setEditContent(data.content);
                    setEditing(true);
                  }}
                >
                  <Ionicons name="create-outline" size={14} color={colors.oceanDeep} />
                  <Text style={styles.editBtnText}>수정</Text>
                </Pressable>
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() =>
                    Alert.alert('삭제', '글을 삭제할까요?', [
                      { text: '취소', style: 'cancel' },
                      { text: '삭제', style: 'destructive', onPress: () => deleteMutation.mutate() },
                    ])
                  }
                >
                  <Ionicons name="trash-outline" size={14} color={colors.error} />
                  <Text style={styles.deleteBtnText}>삭제</Text>
                </Pressable>
              </View>
            ) : null}
          </AppCard>
        )}

        <Text style={styles.section}>댓글 {data.comments?.length ?? 0}</Text>
        {(data.comments ?? []).map((c: { id: string; content: string; user: { nickname: string; profileImage?: string | null } }) => (
          <View key={c.id} style={styles.comment}>
            <UserAvatar nickname={c.user.nickname} profileImage={c.user.profileImage} size={28} />
            <View style={styles.commentBody}>
              <Text style={styles.commentAuthor}>{c.user.nickname}</Text>
              <Text style={styles.commentText}>{c.content}</Text>
            </View>
          </View>
        ))}

        {user ? (
          <AppCard style={styles.commentForm}>
            <TextInput
              style={styles.commentInput}
              placeholder="댓글 작성"
              placeholderTextColor={colors.textMuted}
              value={comment}
              onChangeText={setComment}
              multiline
            />
            <Pressable
              style={[styles.btn, !comment.trim() && styles.btnDisabled]}
              onPress={() => {
                if (!comment.trim()) return;
                commentMutation.mutate(comment.trim());
              }}
            >
              <Text style={styles.btnText}>댓글 등록</Text>
            </Pressable>
          </AppCard>
        ) : null}
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl },
  postCard: { marginBottom: spacing.lg },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  authorName: { fontSize: 14, fontWeight: '700', color: colors.oceanDeep, fontFamily: fonts.bold },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm, fontFamily: fonts.bold },
  meta: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.regular },
  postImage: { width: '100%', height: 200, borderRadius: radius.sm, marginBottom: spacing.md },
  body: { fontSize: 15, lineHeight: 24, color: colors.textPrimary, fontFamily: fonts.regular },
  section: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.oceanDeep,
    marginBottom: spacing.sm,
    fontFamily: fonts.bold,
  },
  comment: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  commentBody: { flex: 1 },
  commentAuthor: { fontWeight: '700', fontSize: 13, color: colors.oceanDeep, fontFamily: fonts.bold },
  commentText: { fontSize: 14, color: colors.textPrimary, marginTop: 4, lineHeight: 20, fontFamily: fonts.regular },
  commentForm: { marginTop: spacing.md, gap: spacing.sm },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    minHeight: 80,
    backgroundColor: colors.bg,
    textAlignVertical: 'top',
    fontFamily: fonts.regular,
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    minHeight: 44,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    textAlignVertical: 'top',
    fontFamily: fonts.regular,
  },
  bodyInput: { minHeight: 120 },
  btn: {
    backgroundColor: colors.oceanBright,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontFamily: fonts.bold },
  ownerActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
  },
  editBtnText: { fontWeight: '600', color: colors.oceanDeep, fontFamily: fonts.bold },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.sm,
    padding: 10,
  },
  deleteBtnText: { fontWeight: '600', color: colors.error, fontFamily: fonts.bold },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
