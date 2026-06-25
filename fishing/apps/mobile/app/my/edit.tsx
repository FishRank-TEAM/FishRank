import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import Screen from '@/components/ui/Screen';
import ChipTabs from '@/components/ui/ChipTabs';
import UserAvatar from '@/components/ui/UserAvatar';
import { LoadingState } from '@/components/ui/States';
import {
  KOREAN_REGION_GROUPS,
  buildActivityRegion,
  parseActivityRegion,
  getDistrictsByProvince,
} from '@/data/korean-regions';
import { toast } from '@/store/toast.store';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { radius, spacing } from '@/theme/layout';

const FISHING_CATEGORIES = [
  { key: 'freshwater', label: '민물' },
  { key: 'saltwater', label: '바다' },
  { key: 'both', label: '둘 다' },
] as const;

export default function MyEditScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const authUser = useAuthStore((s) => s.user);

  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data.data,
  });

  const [bio, setBio] = useState('');
  const [province, setProvince] = useState<string>('서울');
  const [district, setDistrict] = useState<string>('강남');
  const [fishingCategory, setFishingCategory] = useState('both');

  useEffect(() => {
    if (!me) return;
    const region = parseActivityRegion(me.activityRegion);
    setBio(me.bio ?? '');
    setProvince(region?.province ?? '서울');
    setDistrict(region?.district ?? '강남');
    setFishingCategory(me.fishingCategory ?? 'both');
  }, [me]);

  const imageMutation = useMutation({
    mutationFn: async (uri: string) => {
      const form = new FormData();
      form.append('image', {
        uri,
        name: `profile-${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as unknown as Blob);
      return api.patch('/users/me/profile-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (res) => {
      const updated = res.data.data;
      queryClient.invalidateQueries({ queryKey: ['me'] });
      if (authUser && updated?.profileImage !== undefined) {
        setUser({ ...authUser, profileImage: updated.profileImage });
      }
      toast('프로필 사진이 변경되었습니다', 'success');
    },
    onError: () => toast('프로필 사진 변경에 실패했습니다', 'error', { persistent: true }),
  });

  const deleteImageMutation = useMutation({
    mutationFn: async () => api.delete('/users/me/profile-image'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      if (authUser) setUser({ ...authUser, profileImage: null });
      toast('프로필 사진이 삭제되었습니다', 'success');
    },
    onError: () => Alert.alert('삭제 실패', '프로필 사진 삭제에 실패했습니다.'),
  });

  const mutation = useMutation({
    mutationFn: async () =>
      api.patch('/users/me', {
        bio: bio.trim() || null,
        activityRegion: province && district ? buildActivityRegion(province, district) : undefined,
        fishingCategory,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast('프로필이 저장되었습니다', 'success');
      router.back();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast(typeof msg === 'string' ? msg : '프로필 저장에 실패했습니다', 'error', { persistent: true });
    },
  });

  async function pickProfileImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      imageMutation.mutate(result.assets[0].uri);
    }
  }

  const districts = getDistrictsByProvince(province);

  if (isLoading) return <LoadingState />;

  return (
    <>
      <Stack.Screen options={{ title: '프로필 편집' }} />
      <Screen>
        <View style={styles.avatarSection}>
          <UserAvatar
            nickname={me?.nickname ?? ''}
            profileImage={me?.profileImage}
            size={88}
            onPress={pickProfileImage}
            showEditBadge
            loading={imageMutation.isPending}
          />
          <Pressable style={styles.photoBtn} onPress={pickProfileImage} disabled={imageMutation.isPending}>
            <Ionicons name="camera-outline" size={16} color={colors.oceanBright} />
            <Text style={styles.photoBtnText}>
              {imageMutation.isPending ? '업로드 중...' : '사진 변경'}
            </Text>
          </Pressable>
          {me?.profileImage ? (
            <Pressable
              style={styles.removeBtn}
              onPress={() =>
                Alert.alert('사진 삭제', '프로필 사진을 삭제할까요?', [
                  { text: '취소', style: 'cancel' },
                  { text: '삭제', style: 'destructive', onPress: () => deleteImageMutation.mutate() },
                ])
              }
            >
              <Text style={styles.removeBtnText}>사진 삭제</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.label}>소개</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          placeholder="낚시 스타일, 자주 가는 포인트 등"
          placeholderTextColor={colors.textMuted}
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={500}
        />

        <Text style={styles.label}>주 활동 지역</Text>
        {KOREAN_REGION_GROUPS.map((group) => (
          <View key={group.label} style={styles.regionGroup}>
            <Text style={styles.regionGroupLabel}>{group.label}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
              contentContainerStyle={styles.chipScrollContent}
            >
              {group.provinces.map((p) => (
                <Pressable
                  key={p.label}
                  style={[styles.chip, province === p.label && styles.chipActive]}
                  onPress={() => {
                    setProvince(p.label);
                    setDistrict(p.districts[0]?.name ?? '');
                  }}
                >
                  <Text style={[styles.chipText, province === p.label && styles.chipTextActive]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ))}
        <ScrollView
          style={styles.districtScroll}
          contentContainerStyle={styles.districtRow}
          nestedScrollEnabled
        >
          {districts.map((d) => (
            <Pressable
              key={d.name}
              style={[styles.chip, district === d.name && styles.chipActive]}
              onPress={() => setDistrict(d.name)}
            >
              <Text style={[styles.chipText, district === d.name && styles.chipTextActive]}>
                {d.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>낚시 유형</Text>
        <ChipTabs
          tabs={FISHING_CATEGORIES.map((c) => ({ key: c.key, label: c.label }))}
          active={fishingCategory}
          onChange={setFishingCategory}
        />

        <Pressable
          style={styles.saveBtn}
          disabled={mutation.isPending}
          onPress={() => mutation.mutate()}
        >
          <Text style={styles.saveBtnText}>{mutation.isPending ? '저장 중...' : '저장하기'}</Text>
        </Pressable>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  avatarSection: { alignItems: 'center', marginBottom: spacing.lg, gap: spacing.sm },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.oceanBright,
  },
  photoBtnText: { color: colors.oceanBright, fontWeight: '700', fontSize: 13, fontFamily: fonts.bold },
  removeBtn: { paddingVertical: 4 },
  removeBtnText: { color: colors.error, fontSize: 12, fontFamily: fonts.regular },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.oceanDeep,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    fontFamily: fonts.bold,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
  },
  bioInput: { minHeight: 100, textAlignVertical: 'top' },
  chipScroll: { marginBottom: spacing.xs },
  chipScrollContent: { paddingRight: spacing.md, gap: 6 },
  regionGroup: { marginBottom: spacing.sm },
  regionGroupLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
    fontFamily: fonts.regular,
  },
  districtScroll: { maxHeight: 160, marginBottom: spacing.sm },
  districtRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 6,
  },
  chipActive: { backgroundColor: colors.oceanBright, borderColor: colors.oceanBright },
  chipText: { fontSize: 12, color: colors.textSub, fontFamily: fonts.regular },
  chipTextActive: { color: '#fff', fontWeight: '700', fontFamily: fonts.bold },
  saveBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.oceanBright,
    borderRadius: radius.sm,
    padding: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, fontFamily: fonts.bold },
});
