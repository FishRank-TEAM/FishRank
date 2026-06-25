import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, Image, ScrollView } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COMMUNITY_TAGS, type CommunityTagKey } from '@fishrank/shared';
import { api } from '@/lib/api';
import Screen from '@/components/ui/Screen';
import { colors } from '@/theme/colors';

export default function CommunityWriteScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [tags, setTags] = useState<CommunityTagKey[]>([]);

  function toggleTag(key: CommunityTagKey) {
    setTags((prev) => {
      if (prev.includes(key)) return prev.filter((t) => t !== key);
      if (prev.length >= 3) {
        Alert.alert('태그 제한', '태그는 최대 3개까지 선택할 수 있습니다.');
        return prev;
      }
      return [...prev, key];
    });
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('content', content.trim());
      if (tags.length > 0) form.append('tags', JSON.stringify(tags));
      if (imageUri) {
        form.append('image', {
          uri: imageUri,
          name: `post-${Date.now()}.jpg`,
          type: 'image/jpeg',
        } as unknown as Blob);
      }
      return (await api.post('/posts', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data;
    },
    onSuccess: (res) => {
      const postId = res.data?.id;
      Alert.alert('등록 완료', '글이 등록되었습니다.');
      router.replace(postId ? `/community/${postId}` : '/(tabs)/community');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('등록 실패', typeof msg === 'string' ? msg : '글 등록에 실패했습니다.');
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: '글 쓰기' }} />
      <Screen>
        <TextInput
          style={styles.input}
          placeholder="제목"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.body]}
          placeholder="내용을 입력하세요"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />
        <Text style={styles.label}>태그 (최대 3개)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
          {COMMUNITY_TAGS.map((t) => {
            const active = tags.includes(t.key);
            return (
              <Pressable
                key={t.key}
                style={[styles.tagChip, active && styles.tagChipActive]}
                onPress={() => toggleTag(t.key)}
              >
                <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {imageUri ? (
          <View style={styles.imageWrap}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
            <Pressable onPress={() => setImageUri(null)}>
              <Text style={styles.removeImage}>사진 제거</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.imageBtn} onPress={pickImage}>
            <Text style={styles.imageBtnText}>📷 사진 첨부 (선택)</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.btn}
          disabled={mutation.isPending}
          onPress={() => {
            if (!title.trim() || !content.trim()) {
              Alert.alert('입력 필요', '제목과 내용을 입력해 주세요.');
              return;
            }
            mutation.mutate();
          }}
        >
          <Text style={styles.btnText}>{mutation.isPending ? '등록 중...' : '등록하기'}</Text>
        </Pressable>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.surface,
    marginBottom: 12,
    fontSize: 15,
  },
  body: { minHeight: 200 },
  label: { fontSize: 14, fontWeight: '700', color: colors.oceanDeep, marginBottom: 8 },
  tagScroll: { marginBottom: 12 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 8,
  },
  tagChipActive: { backgroundColor: colors.oceanBright, borderColor: colors.oceanBright },
  tagChipText: { fontSize: 13, color: colors.textSub },
  tagChipTextActive: { color: '#fff', fontWeight: '700' },
  imageBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: colors.surfaceMuted,
  },
  imageBtnText: { color: colors.oceanDeep, fontWeight: '600' },
  imageWrap: { marginBottom: 12 },
  preview: { width: '100%', height: 180, borderRadius: 8 },
  removeImage: { color: colors.error, marginTop: 6, fontSize: 13, textAlign: 'center' },
  btn: {
    backgroundColor: colors.oceanBright,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
