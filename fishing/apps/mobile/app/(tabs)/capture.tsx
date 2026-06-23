import { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import CaptureOverlay from '@/components/CaptureOverlay';
import { uploadCertifiedCatch } from '@/lib/api';

export default function CaptureScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [uploading, setUploading] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [memo, setMemo] = useState('');

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#48cae4" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>공식 인증 촬영을 위해 카메라 권한이 필요합니다.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>권한 허용</Text>
        </Pressable>
      </View>
    );
  }

  async function handleCapture() {
    if (!cameraRef.current || uploading) return;
    setUploading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (!photo?.uri) throw new Error('촬영 실패');

      const res = await uploadCertifiedCatch(
        photo.uri,
        locationName.trim() || undefined,
        memo.trim() || undefined,
      );
      const { message, status } = res.data.data;
      Alert.alert(status === 'approved' ? '인증 완료' : '업로드 완료', message);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '업로드에 실패했습니다.';
      Alert.alert('업로드 실패', typeof msg === 'string' ? msg : '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <CaptureOverlay />
      </CameraView>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="낚시 장소 (선택)"
          placeholderTextColor="#64748b"
          value={locationName}
          onChangeText={setLocationName}
        />
        <TextInput
          style={styles.input}
          placeholder="메모 (선택)"
          placeholderTextColor="#64748b"
          value={memo}
          onChangeText={setMemo}
        />
        <Pressable style={styles.shutter} onPress={handleCapture} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color="#003d6b" />
          ) : (
            <Text style={styles.shutterText}>촬영 · 인증 업로드</Text>
          )}
        </Pressable>
        <Text style={styles.note}>갤러리 선택 없음 — 실시간 촬영만 허용</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#002847',
  },
  permText: { color: '#e2e8f0', textAlign: 'center', marginBottom: 16 },
  button: {
    backgroundColor: '#48cae4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: { color: '#003d6b', fontWeight: '700' },
  form: {
    backgroundColor: '#002847',
    padding: 16,
    gap: 8,
  },
  input: {
    backgroundColor: '#0f3d5c',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#1e5a7a',
  },
  shutter: {
    backgroundColor: '#48cae4',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  shutterText: { color: '#003d6b', fontWeight: '800', fontSize: 16 },
  note: { color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 4 },
});
