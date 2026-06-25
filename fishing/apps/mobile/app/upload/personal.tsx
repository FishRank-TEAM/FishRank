import { useState } from 'react';
import { Text, StyleSheet, Pressable, Alert, TextInput, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import Screen from '@/components/ui/Screen';
import { colors } from '@/theme/colors';

export default function PersonalUploadScreen() {
  const router = useRouter();
  const [uri, setUri] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('');
  const [memo, setMemo] = useState('');
  const [uploading, setUploading] = useState(false);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setUri(result.assets[0].uri);
    }
  }

  async function handleUpload() {
    if (!uri) {
      Alert.alert('사진 선택', '업로드할 사진을 선택해 주세요.');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', {
        uri,
        name: `brag-${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as unknown as Blob);
      if (locationName.trim()) form.append('locationName', locationName.trim());
      if (memo.trim()) form.append('memo', memo.trim());

      const res = await api.post('/catches/personal', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('업로드 완료', res.data.data?.message ?? '자랑 기록이 등록되었습니다.', [
        { text: '확인', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('업로드 실패', typeof msg === 'string' ? msg : '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: '자랑 기록 올리기' }} />
      <Screen>
        <Text style={styles.desc}>사진으로 자랑 기록을 남기세요. 공식 인증과 달리 갤러리 사진을 사용할 수 있습니다.</Text>
        <Pressable style={styles.pickBtn} onPress={pickImage}>
          <Text style={styles.pickBtnText}>{uri ? '다른 사진 선택' : '📷 사진 선택'}</Text>
        </Pressable>
        {uri ? <Image source={{ uri }} style={styles.preview} /> : null}
        <TextInput
          style={styles.input}
          placeholder="낚시 장소 (선택)"
          value={locationName}
          onChangeText={setLocationName}
        />
        <TextInput
          style={styles.input}
          placeholder="메모 (선택)"
          value={memo}
          onChangeText={setMemo}
        />
        <Pressable style={styles.btn} onPress={handleUpload} disabled={uploading}>
          <Text style={styles.btnText}>{uploading ? '업로드 중...' : '자랑 기록 업로드'}</Text>
        </Pressable>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  desc: { fontSize: 14, color: colors.textSub, lineHeight: 20, marginBottom: 16 },
  pickBtn: {
    backgroundColor: colors.oceanLight,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  pickBtnText: { color: colors.oceanDeep, fontWeight: '700' },
  preview: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  btn: {
    backgroundColor: colors.oceanBright,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
