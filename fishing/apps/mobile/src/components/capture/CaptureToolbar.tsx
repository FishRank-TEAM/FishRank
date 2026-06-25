import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LevelIndicator from '@/components/capture/LevelIndicator';
import { colors } from '@/theme/colors';

type FlashMode = 'off' | 'on' | 'auto';

type Props = {
  torch: boolean;
  onTorchChange: (v: boolean) => void;
  flash: FlashMode;
  onFlashChange: (v: FlashMode) => void;
  showGrid: boolean;
  onGridChange: (v: boolean) => void;
  showGuide: boolean;
  onGuideChange: (v: boolean) => void;
  showLevel: boolean;
  onLevelChange: (v: boolean) => void;
  zoom: number;
  onZoomChange: (v: number) => void;
  roll: number;
  pitch: number;
  isLevel: boolean;
  sensorAvailable: boolean;
};

const FLASH_CYCLE: FlashMode[] = ['off', 'auto', 'on'];

export default function CaptureToolbar({
  torch,
  onTorchChange,
  flash,
  onFlashChange,
  showGrid,
  onGridChange,
  showGuide,
  onGuideChange,
  showLevel,
  onLevelChange,
  zoom,
  onZoomChange,
  roll,
  pitch,
  isLevel,
  sensorAvailable,
}: Props) {
  function cycleFlash() {
    const idx = FLASH_CYCLE.indexOf(flash);
    onFlashChange(FLASH_CYCLE[(idx + 1) % FLASH_CYCLE.length]);
  }

  const flashIcon =
    flash === 'on' ? 'flash' : flash === 'auto' ? 'flash-outline' : 'flash-off-outline';

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.row}>
        <IconBtn
          icon={torch ? 'flashlight' : 'flashlight-outline'}
          label="조명"
          active={torch}
          onPress={() => onTorchChange(!torch)}
        />
        <IconBtn icon={flashIcon} label="플래시" active={flash !== 'off'} onPress={cycleFlash} />
        <IconBtn
          icon="grid-outline"
          label="격자"
          active={showGrid}
          onPress={() => onGridChange(!showGrid)}
        />
        <IconBtn
          icon="resize-outline"
          label="눈금"
          active={showGuide}
          onPress={() => onGuideChange(!showGuide)}
        />
        <IconBtn
          icon="compass-outline"
          label="수평"
          active={showLevel}
          onPress={() => onLevelChange(!showLevel)}
        />
        <View style={styles.zoom}>
          <Pressable
            style={styles.zoomBtn}
            onPress={() => onZoomChange(Math.max(0, zoom - 0.05))}
            accessibilityLabel="줌 아웃"
          >
            <Ionicons name="remove" size={16} color="#fff" />
          </Pressable>
          <Pressable
            style={styles.zoomBtn}
            onPress={() => onZoomChange(Math.min(1, zoom + 0.05))}
            accessibilityLabel="줌 인"
          >
            <Ionicons name="add" size={16} color="#fff" />
          </Pressable>
        </View>
      </View>

      {showLevel && sensorAvailable ? (
        <LevelIndicator roll={roll} pitch={pitch} isLevel={isLevel} compact />
      ) : null}
    </View>
  );
}

function IconBtn({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.btn, active && styles.btnActive]}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Ionicons name={icon} size={20} color={active ? colors.brandGreen : '#fff'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  btnActive: {
    backgroundColor: 'rgba(0,60,30,0.65)',
    borderWidth: 1,
    borderColor: colors.brandGreen,
  },
  zoom: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 'auto',
  },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
});
