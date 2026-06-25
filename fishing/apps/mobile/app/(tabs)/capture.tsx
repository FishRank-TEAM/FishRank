import { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions, type FlashMode } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CaptureOverlay from '@/components/CaptureOverlay';
import CaptureToolbar from '@/components/capture/CaptureToolbar';
import HeroBackground from '@/components/HeroBackground';
import { useDeviceLevel } from '@/hooks/useDeviceLevel';
import { uploadCertifiedCatch } from '@/lib/api';
import { colors } from '@/theme/colors';

export default function CaptureScreen() {
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [uploading, setUploading] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [memo, setMemo] = useState('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const [torch, setTorch] = useState(false);
  const [flash, setFlash] = useState<FlashMode>('auto');
  const [zoom, setZoom] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showLevel, setShowLevel] = useState(true);

  const { roll, pitch, isLevel, sensorAvailable } = useDeviceLevel(showLevel);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.oceanBright} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <HeroBackground>
        <View style={styles.permWrap}>
          <View style={styles.permCard}>
            <View style={styles.permIconWrap}>
              <Ionicons name="camera" size={32} color={colors.oceanBright} />
            </View>
            <Text style={styles.permTitle}>카메라 권한이 필요합니다</Text>
            <Text style={styles.permText}>공식 인증 촬영을 위해 카메라 접근을 허용해 주세요.</Text>
            <Pressable style={styles.button} onPress={requestPermission}>
              <Text style={styles.buttonText}>권한 허용</Text>
            </Pressable>
          </View>
        </View>
      </HeroBackground>
    );
  }

  async function handleCapture() {
    if (!cameraRef.current || uploading) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (!photo?.uri) throw new Error('촬영 실패');
      setPreviewUri(photo.uri);
    } catch {
      Alert.alert('촬영 실패', '다시 시도해 주세요.');
    }
  }

  async function handleUpload() {
    if (!previewUri || uploading) return;
    setUploading(true);
    try {
      const res = await uploadCertifiedCatch(
        previewUri,
        locationName.trim() || undefined,
        memo.trim() || undefined,
      );
      const { message, status } = res.data.data;
      setPreviewUri(null);
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
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        zoom={zoom}
        enableTorch={torch}
        flash={flash}
      >
        <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
          <CaptureToolbar
            torch={torch}
            onTorchChange={setTorch}
            flash={flash}
            onFlashChange={setFlash}
            showGrid={showGrid}
            onGridChange={setShowGrid}
            showGuide={showGuide}
            onGuideChange={setShowGuide}
            showLevel={showLevel}
            onLevelChange={setShowLevel}
            zoom={zoom}
            onZoomChange={setZoom}
            roll={roll}
            pitch={pitch}
            isLevel={isLevel}
            sensorAvailable={sensorAvailable}
          />
        </View>

        <CaptureOverlay
          showGrid={showGrid}
          showGuide={showGuide}
          showLevel={showLevel}
          roll={roll}
          isLevel={isLevel}
        />
      </CameraView>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="낚시 장소 (선택)"
          placeholderTextColor={colors.textMuted}
          value={locationName}
          onChangeText={setLocationName}
        />
        <TextInput
          style={styles.input}
          placeholder="메모 (선택)"
          placeholderTextColor={colors.textMuted}
          value={memo}
          onChangeText={setMemo}
        />
        <Pressable style={styles.shutter} onPress={handleCapture} disabled={uploading}>
          <Text style={styles.shutterText}>촬영</Text>
        </Pressable>
      </View>

      <Modal visible={!!previewUri} animationType="slide" onRequestClose={() => setPreviewUri(null)}>
        <View style={styles.previewWrap}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
          ) : null}
          <Text style={styles.previewTitle}>촬영 미리보기</Text>
          <Text style={styles.previewHint}>사진을 확인한 뒤 인증 업로드하거나 다시 촬영하세요.</Text>
          <View style={styles.previewActions}>
            <Pressable
              style={styles.retakeBtn}
              disabled={uploading}
              onPress={() => setPreviewUri(null)}
            >
              <Text style={styles.retakeText}>재촬영</Text>
            </Pressable>
            <Pressable style={styles.uploadBtn} disabled={uploading} onPress={handleUpload}>
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.uploadText}>인증 업로드</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  camera: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  permWrap: { flex: 1, justifyContent: 'center', padding: 24 },
  permCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    elevation: 4,
  },
  permIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.oceanLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  permTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.oceanDeep,
    marginBottom: 8,
    textAlign: 'center',
  },
  permText: {
    color: colors.textSub,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    fontSize: 14,
  },
  button: {
    backgroundColor: colors.oceanBright,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  form: {
    backgroundColor: colors.surface,
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    padding: 12,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
  },
  shutter: {
    backgroundColor: colors.oceanBright,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  shutterText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  previewWrap: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 20,
    justifyContent: 'center',
  },
  previewImage: { width: '100%', height: '55%', borderRadius: 12, backgroundColor: '#000' },
  previewTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.oceanDeep,
    marginTop: 20,
    textAlign: 'center',
  },
  previewHint: { fontSize: 14, color: colors.textSub, textAlign: 'center', marginTop: 8 },
  previewActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  retakeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  retakeText: { fontWeight: '700', color: colors.textPrimary },
  uploadBtn: {
    flex: 1,
    backgroundColor: colors.oceanBright,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  uploadText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
