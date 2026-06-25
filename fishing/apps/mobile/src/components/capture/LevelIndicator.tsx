import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

type Props = {
  roll: number;
  pitch: number;
  isLevel: boolean;
  compact?: boolean;
};

/** 버블 수평기 + 기울기 수치 */
export default function LevelIndicator({ roll, pitch, isLevel, compact }: Props) {
  const bubbleX = Math.max(-14, Math.min(14, roll * 1.2));

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={[styles.tube, isLevel && styles.tubeLevel]}>
        <View style={[styles.bubble, { transform: [{ translateX: bubbleX }] }, isLevel && styles.bubbleLevel]} />
        <View style={styles.centerMark} />
      </View>
      {!compact ? (
        <View style={styles.meta}>
          <Text style={[styles.status, isLevel && styles.statusLevel]}>
            {isLevel ? '수평 OK' : '기울임'}
          </Text>
          <Text style={styles.deg}>
            {Math.abs(roll).toFixed(1)}° · {Math.abs(pitch).toFixed(1)}°
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 4,
  },
  wrapCompact: {
    alignSelf: 'center',
  },
  tube: {
    width: 72,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tubeLevel: {
    borderColor: colors.brandGreen,
    backgroundColor: 'rgba(0,80,40,0.55)',
  },
  bubble: {
    position: 'absolute',
    alignSelf: 'center',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,193,7,0.95)',
    borderWidth: 1,
    borderColor: '#fff',
  },
  bubbleLevel: {
    backgroundColor: colors.brandGreen,
  },
  centerMark: {
    alignSelf: 'center',
    width: 2,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 1,
  },
  meta: { alignItems: 'center' },
  status: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '700',
  },
  statusLevel: { color: '#b8f5d0' },
  deg: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 9,
    fontWeight: '600',
  },
  badge: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '700',
    minWidth: 32,
  },
  badgeLevel: { color: '#b8f5d0' },
});
