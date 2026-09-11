import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useLidarDepth } from '@/hooks/useLidarDepth';
import { LIDAR_LENGTH_SCALE_BIAS, LIDAR_MIN_CONFIDENCE } from '@/lib/measure/calibration';
import { computeLengthCm, type PixelPoint } from '@/lib/measure/geometry';
import { fetchKeypoints } from '@/lib/measure/keypoints';
import { colors } from '@/theme/colors';
import { text } from '@/theme/text';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type TapSample = {
  point: PixelPoint;
  depthMeters: number | null;
  confidence: string;
};

export default function MeasurePrecisionScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const lidar = useLidarDepth(true);
  const [tap, setTap] = useState<TapSample | null>(null);
  const [head, setHead] = useState<PixelPoint | null>(null);
  const [tail, setTail] = useState<PixelPoint | null>(null);
  const [lengthCm, setLengthCm] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [cam, setCam] = useState<CameraView | null>(null);

  const onTap = useCallback(
    async (evt: { nativeEvent: { locationX: number; locationY: number } }) => {
      const x = evt.nativeEvent.locationX;
      const y = evt.nativeEvent.locationY;
      const k = await lidar.intrinsics();
      const imgX = k ? (x / SCREEN_W) * k.imageWidth : x;
      const imgY = k ? (y / SCREEN_H) * k.imageHeight : y;
      const sample = await lidar.sampleAt(imgX, imgY);
      setTap({
        point: { x: imgX, y: imgY },
        depthMeters: sample?.depthMeters ?? null,
        confidence: sample?.confidence ?? 'unknown',
      });
      if (!head) {
        setHead({ x: imgX, y: imgY });
        setStatus('머리 지점 선택됨 → 꼬리를 탭하세요');
      } else if (!tail) {
        setTail({ x: imgX, y: imgY });
        setStatus('머리/꼬리 선택됨 → 측정 실행');
      } else {
        setHead({ x: imgX, y: imgY });
        setTail(null);
        setLengthCm(null);
        setStatus('머리 지점 재선택 → 꼬리를 탭하세요');
      }
    },
    [head, lidar, tail],
  );

  const runMeasure = useCallback(async () => {
    if (!head || !tail) {
      Alert.alert('지점 필요', '머리와 꼬리 픽셀을 먼저 선택하세요.');
      return;
    }
    setBusy(true);
    try {
      const frame = await lidar.captureFrame();
      if (!frame) {
        Alert.alert(
          'Depth 없음',
          'LiDAR 프레임을 캡처하지 못했습니다. EAS Dev Client + iPhone Pro 실기기에서 다시 시도하세요.',
        );
        return;
      }
      const result = computeLengthCm({
        head,
        tail,
        intrinsics: frame.intrinsics,
        depthWidth: frame.depthWidth,
        depthHeight: frame.depthHeight,
        depthMeters: frame.depthMeters,
        confidence: frame.confidence,
        minConfidence: LIDAR_MIN_CONFIDENCE,
        scaleBias: LIDAR_LENGTH_SCALE_BIAS,
      });
      if (!result.ok) {
        setLengthCm(null);
        setStatus(`측정 실패: ${result.reason}`);
        Alert.alert(
          '재촬영 권장',
          `신뢰도 부족 (${result.reason}). 반사광·젖은 표면을 피하고 다시 촬영하세요.`,
        );
        return;
      }
      setLengthCm(result.lengthCm);
      setStatus(
        `길이 ${result.lengthCm} cm (head=${result.headConfidence}, tail=${result.tailConfidence})`,
      );
    } finally {
      setBusy(false);
    }
  }, [head, lidar, tail]);

  const runAutoKeypoints = useCallback(async () => {
    if (!cam) {
      Alert.alert('카메라', '카메라가 준비되지 않았습니다.');
      return;
    }
    setBusy(true);
    try {
      const photo = await cam.takePictureAsync({ quality: 0.85 });
      if (!photo?.uri) throw new Error('촬영 실패');
      const framePromise = lidar.captureFrame();
      const kp = await fetchKeypoints(photo.uri);
      const frame = await framePromise;
      if (!kp?.head || !kp?.tail) {
        Alert.alert('키포인트 실패', '서버에서 머리/꼬리를 찾지 못했습니다.');
        return;
      }
      setHead(kp.head);
      setTail(kp.tail);
      if (!frame) {
        setStatus('키포인트 OK · Depth 프레임 없음 (Dev Client 필요)');
        return;
      }
      const result = computeLengthCm({
        head: kp.head,
        tail: kp.tail,
        intrinsics: frame.intrinsics,
        depthWidth: frame.depthWidth,
        depthHeight: frame.depthHeight,
        depthMeters: frame.depthMeters,
        confidence: frame.confidence,
        minConfidence: LIDAR_MIN_CONFIDENCE,
        scaleBias: LIDAR_LENGTH_SCALE_BIAS,
      });
      if (!result.ok) {
        setStatus(`자동측정 실패: ${result.reason}`);
        return;
      }
      setLengthCm(result.lengthCm);
      setStatus(`자동측정 ${result.lengthCm} cm`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '자동측정 실패';
      Alert.alert('오류', msg);
    } finally {
      setBusy(false);
    }
  }, [cam, lidar]);

  if (Platform.OS !== 'ios') {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: '정밀 측정' }} />
        <Text style={styles.warn}>정밀 측정(LiDAR)은 iOS Dev Client에서만 지원합니다.</Text>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.oceanBright} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: '정밀 측정' }} />
        <Text style={styles.warn}>카메라 권한이 필요합니다.</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>권한 허용</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: '정밀 측정 (LiDAR)', headerTintColor: '#fff' }} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onTap}>
        <CameraView ref={setCam} style={StyleSheet.absoluteFill} facing="back" />
      </Pressable>

      {head ? <Marker x={head.x} y={head.y} label="H" color="#22c55e" /> : null}
      {tail ? <Marker x={tail.x} y={tail.y} label="T" color="#f59e0b" /> : null}

      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.hudTitle}>LiDAR Depth Debug</Text>
        <Text style={styles.hudLine}>
          지원: {lidar.supported == null ? '…' : lidar.supported ? 'YES' : 'NO'} · 세션:{' '}
          {lidar.running ? 'ON' : 'OFF'}
        </Text>
        {lidar.error ? <Text style={styles.hudErr}>{lidar.error}</Text> : null}
        {tap ? (
          <Text style={styles.hudLine}>
            tap depth: {tap.depthMeters?.toFixed(3) ?? '—'} m ({tap.confidence})
          </Text>
        ) : (
          <Text style={styles.hudLine}>화면을 탭하면 해당 지점 depth를 표시합니다</Text>
        )}
        {lengthCm != null ? <Text style={styles.length}>{lengthCm.toFixed(1)} cm</Text> : null}
        {status ? <Text style={styles.hudLine}>{status}</Text> : null}
      </View>

      <View style={[styles.toolbar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.btn} onPress={() => void lidar.start()} disabled={busy}>
          <Ionicons name="play" size={18} color="#fff" />
          <Text style={styles.btnText}>세션</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => void runMeasure()} disabled={busy}>
          <Ionicons name="resize" size={18} color="#fff" />
          <Text style={styles.btnText}>수동측정</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.btnAccent]}
          onPress={() => void runAutoKeypoints()}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="flash" size={18} color="#fff" />
          )}
          <Text style={styles.btnText}>자동측정</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Marker({
  x,
  y,
  label,
  color,
}: {
  x: number;
  y: number;
  label: string;
  color: string;
}) {
  const left = x > SCREEN_W ? (x / 1920) * SCREEN_W : x;
  const top = y > SCREEN_H ? (y / 1080) * SCREEN_H : y;
  return (
    <View style={[styles.marker, { left: left - 12, top: top - 12, borderColor: color }]}>
      <Text style={[styles.markerText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.bg,
  },
  warn: { ...text.regular(15), color: colors.textPrimary, textAlign: 'center', marginBottom: 16 },
  hud: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  hudTitle: { ...text.bold(14), color: '#fff' },
  hudLine: { ...text.regular(12), color: '#e2e8f0' },
  hudErr: { ...text.regular(12), color: '#fca5a5' },
  length: { ...text.bold(28), color: '#4ade80', marginTop: 4 },
  toolbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brandNavy,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnAccent: { backgroundColor: colors.brandGreen },
  btnText: { ...text.bold(13), color: '#fff' },
  marker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  markerText: { ...text.bold(11) },
});
