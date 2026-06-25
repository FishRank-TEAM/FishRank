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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  FISH_CATEGORY_OPTIONS,
  getFishCategoryDescription,
  getFishCategoryHeroClass,
  getFishCategoryLabel,
  type FishSpeciesCategory,
} from '@fishrank/shared';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/images';
import Screen from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/States';
import Button from '@/components/ui/Button';
import TextField from '@/components/ui/TextField';
import { SegmentedTabs } from '@/components/ui/ChipTabs';
import { useAuthStore } from '@/store/auth.store';
import { colors } from '@/theme/colors';
import { text } from '@/theme/text';
import { radius, spacing } from '@/theme/layout';

type FishDetail = {
  speciesId: number;
  nameKo: string;
  nameEn: string | null;
  scientificName: string | null;
  category: string;
  imageUrl: string | null;
  season: string | null;
  bait: string | null;
  technique: string | null;
  habitat: string | null;
  summary: string | null;
};

export default function EncyclopediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<FishSpeciesCategory>('freshwater');
  const [season, setSeason] = useState('');
  const [bait, setBait] = useState('');
  const [technique, setTechnique] = useState('');
  const [habitat, setHabitat] = useState('');
  const [summary, setSummary] = useState('');
  const [note, setNote] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['encyclopedia-detail', id],
    queryFn: async () => (await api.get(`/encyclopedia/${id}/detail`)).data.data as FishDetail,
    enabled: !!id,
  });

  const fillForm = useCallback(() => {
    if (!data) return;
    setCategory(getFishCategoryHeroClass(data.category));
    setSeason(data.season ?? '');
    setBait(data.bait ?? '');
    setTechnique(data.technique ?? '');
    setHabitat(data.habitat ?? '');
    setSummary(data.summary ?? '');
    setNote('');
    setImageUri(null);
  }, [data]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('category', category);
      form.append('season', season.trim());
      form.append('bait', bait.trim());
      form.append('technique', technique.trim());
      form.append('habitat', habitat.trim());
      form.append('summary', summary.trim());
      if (note.trim()) form.append('note', note.trim());
      if (imageUri) {
        form.append('image', {
          uri: imageUri,
          name: 'encyclopedia.jpg',
          type: 'image/jpeg',
        } as unknown as Blob);
      }
      await api.post(`/encyclopedia/${id}/tips`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['encyclopedia-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['encyclopedia'] });
      Alert.alert('저장 완료', '어종 정보가 반영되었습니다.');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      Alert.alert('저장 실패', err?.response?.data?.message ?? '다시 시도해 주세요.');
    },
  });

  const pickImage = async () => {
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
  };

  if (isLoading || !data) {
    return (
      <>
        <Stack.Screen options={{ title: '어종 상세' }} />
        <LoadingState />
      </>
    );
  }

  const heroImage = getImageUrl(data.imageUrl);

  const openForm = () => {
    if (!isLoggedIn) {
      router.push('/(auth)/login');
      return;
    }
    if (!showForm) fillForm();
    setShowForm((v) => !v);
  };

  return (
    <>
      <Stack.Screen options={{ title: data.nameKo }} />
      <Screen scroll={false} padded={false}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {heroImage ? (
            <Image source={{ uri: heroImage }} style={styles.hero} resizeMode="cover" />
          ) : (
            <View style={[styles.heroPlaceholder, styles[`hero_${getFishCategoryHeroClass(data.category)}`]]}>
              <Text style={styles.heroEmoji}>
                {getFishCategoryHeroClass(data.category) === 'saltwater' ? '🐠' : getFishCategoryHeroClass(data.category) === 'both' ? '🐟🌊' : '🐟'}
              </Text>
            </View>
          )}

          <View style={styles.body}>
            <View style={styles.headRow}>
              <View style={styles.headText}>
                <Text style={styles.name}>{data.nameKo}</Text>
                {data.scientificName ? <Text style={styles.sci}>{data.scientificName}</Text> : null}
              </View>
              <View style={[styles.categoryBadge, styles[`badge_${getFishCategoryHeroClass(data.category)}`]]}>
                <Text style={styles.categoryBadgeText}>{getFishCategoryLabel(data.category)}</Text>
              </View>
            </View>
            <Text style={styles.categoryDesc}>{getFishCategoryDescription(data.category)}</Text>

            {data.summary ? <Text style={styles.summary}>{data.summary}</Text> : null}
            {data.season ? <Text style={styles.row}>🗓 시즌: {data.season}</Text> : null}
            {data.bait ? <Text style={styles.row}>🪱 미끼: {data.bait}</Text> : null}
            {data.technique ? <Text style={styles.row}>🎣 기법: {data.technique}</Text> : null}
            {data.habitat ? <Text style={styles.row}>📍 포인트: {data.habitat}</Text> : null}

            <Button
              label={showForm ? '수정 닫기' : '정보 수정'}
              variant={showForm ? 'ghost' : 'secondary'}
              onPress={openForm}
            />

            {showForm && (
              <View style={styles.form}>
                <Text style={styles.formTitle}>분류</Text>
                <SegmentedTabs
                  tabs={FISH_CATEGORY_OPTIONS.map((o) => ({ key: o.value, label: o.label.replace(' (양쪽 서식)', '') }))}
                  active={category}
                  onChange={(key) => setCategory(key as FishSpeciesCategory)}
                  compact
                />

                <Pressable style={styles.imagePick} onPress={pickImage}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.preview} />
                  ) : (
                    <Text style={styles.imagePickText}>대표 사진 선택 (선택)</Text>
                  )}
                </Pressable>

                <TextField label="소개" value={summary} onChangeText={setSummary} multiline />
                <TextField label="시즌" value={season} onChangeText={setSeason} placeholder="예: 5~10월" />
                <TextField label="미끼" value={bait} onChangeText={setBait} />
                <TextField label="기법" value={technique} onChangeText={setTechnique} />
                <TextField label="포인트" value={habitat} onChangeText={setHabitat} />
                <TextField label="메모 (선택)" value={note} onChangeText={setNote} multiline />

                <Button
                  label={submitMutation.isPending ? '저장 중...' : '변경 저장'}
                  onPress={() => submitMutation.mutate()}
                  loading={submitMutation.isPending}
                  disabled={submitMutation.isPending}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl },
  hero: { width: '100%', height: 220 },
  heroPlaceholder: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero_freshwater: { backgroundColor: '#e8f5e9' },
  hero_saltwater: { backgroundColor: '#e3f2fd' },
  hero_both: { backgroundColor: '#e0f2f1' },
  heroEmoji: { fontSize: 48 },
  body: { padding: spacing.md, gap: spacing.sm },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headText: { flex: 1 },
  name: { ...text.bold(22), color: colors.oceanDeep },
  sci: { ...text.regular(13), color: colors.textMuted, marginTop: 2 },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  badge_freshwater: { backgroundColor: '#e8f5e9' },
  badge_saltwater: { backgroundColor: '#e3f2fd' },
  badge_both: { backgroundColor: '#e0f2f1' },
  categoryBadgeText: { ...text.bold(12), color: colors.oceanDeep },
  categoryDesc: { ...text.regular(13), color: colors.textMuted },
  summary: { ...text.regular(14), color: colors.textPrimary, lineHeight: 22, marginTop: 4 },
  row: { ...text.regular(14), color: colors.textPrimary, lineHeight: 22 },
  form: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    gap: spacing.sm,
  },
  formTitle: { ...text.bold(13), color: colors.textPrimary },
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
  },
  imagePickText: { ...text.regular(13), color: colors.textMuted },
  preview: { width: '100%', height: 160 },
});
