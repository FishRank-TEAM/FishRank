import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  FISH_CATEGORY_OPTIONS,
  type FishSpeciesCategory,
} from '@fishrank/shared';
import { api } from '@/lib/api';
import Screen from '@/components/ui/Screen';
import Button from '@/components/ui/Button';
import TextField from '@/components/ui/TextField';
import { SegmentedTabs } from '@/components/ui/ChipTabs';
import { useAuthStore } from '@/store/auth.store';
import { colors } from '@/theme/colors';
import { text } from '@/theme/text';
import { radius, spacing } from '@/theme/layout';

export default function EncyclopediaNewScreen() {
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [nameKo, setNameKo] = useState('');
  const [category, setCategory] = useState<FishSpeciesCategory>('freshwater');
  const [summary, setSummary] = useState('');
  const [season, setSeason] = useState('');
  const [bait, setBait] = useState('');
  const [technique, setTechnique] = useState('');
  const [habitat, setHabitat] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '사진을 선택하려면 갤러리 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  }, []);

  const createMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('nameKo', nameKo.trim());
      form.append('category', category);
      if (summary.trim()) form.append('summary', summary.trim());
      if (season.trim()) form.append('season', season.trim());
      if (bait.trim()) form.append('bait', bait.trim());
      if (technique.trim()) form.append('technique', technique.trim());
      if (habitat.trim()) form.append('habitat', habitat.trim());
      if (imageUri) {
        form.append('image', {
          uri: imageUri,
          name: 'species.jpg',
          type: 'image/jpeg',
        } as unknown as Blob);
      }
      const res = await api.post('/encyclopedia', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data as { speciesId: number; nameKo: string };
    },
    onSuccess: (data) => {
      Alert.alert('등록 완료', `${data.nameKo} 어종이 추가되었습니다.`, [
        { text: '확인', onPress: () => router.replace(`/encyclopedia/${data.speciesId}`) },
      ]);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      Alert.alert('등록 실패', err?.response?.data?.message ?? '다시 시도해 주세요.');
    },
  });

  if (!isLoggedIn) {
    return (
      <>
        <Stack.Screen options={{ title: '어종 추가' }} />
        <Screen>
          <Text style={styles.loginHint}>어종을 추가하려면 로그인이 필요합니다.</Text>
          <Button label="로그인하기" onPress={() => router.push('/(auth)/login')} />
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: '어종 추가' }} />
      <Screen scroll={false} padded={false}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.desc}>사전에 없는 어종을 등록해 주세요.</Text>

          <TextField
            label="어종 이름"
            required
            value={nameKo}
            onChangeText={setNameKo}
            placeholder="예: 강준치"
            maxLength={80}
          />

          <Text style={styles.label}>분류</Text>
          <SegmentedTabs
            tabs={FISH_CATEGORY_OPTIONS.map((o) => ({
              key: o.value,
              label: o.label.replace(' (양쪽 서식)', ''),
            }))}
            active={category}
            onChange={(key) => setCategory(key as FishSpeciesCategory)}
            compact
            style={styles.tabs}
          />

          <Pressable style={styles.imagePick} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.preview} />
            ) : (
              <Text style={styles.imagePickText}>대표 사진 선택 (선택)</Text>
            )}
          </Pressable>

          <TextField label="소개" value={summary} onChangeText={setSummary} multiline placeholder="간단한 설명" />
          <TextField label="시즌" value={season} onChangeText={setSeason} placeholder="예: 5~10월" />
          <TextField label="미끼" value={bait} onChangeText={setBait} />
          <TextField label="기법" value={technique} onChangeText={setTechnique} />
          <TextField label="포인트" value={habitat} onChangeText={setHabitat} />

          <Button
            label={createMutation.isPending ? '등록 중...' : '어종 등록하기'}
            onPress={() => {
              if (nameKo.trim().length < 2) {
                Alert.alert('입력 확인', '어종 이름을 2자 이상 입력해 주세요.');
                return;
              }
              createMutation.mutate();
            }}
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
          />
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  desc: { ...text.regular(14), color: colors.textMuted, marginBottom: spacing.sm },
  loginHint: { ...text.regular(14), color: colors.textSub, marginBottom: spacing.md },
  label: { ...text.bold(13), color: colors.textPrimary, marginTop: spacing.xs },
  tabs: { marginBottom: spacing.sm },
  imagePick: {
    minHeight: 120,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginVertical: spacing.xs,
  },
  imagePickText: { ...text.regular(13), color: colors.textMuted },
  preview: { width: '100%', height: 160 },
});
