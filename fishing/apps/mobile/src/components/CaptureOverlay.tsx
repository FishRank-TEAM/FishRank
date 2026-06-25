import { View, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

type Props = {
  showGrid?: boolean;
  showGuide?: boolean;
  showLevel?: boolean;
  roll?: number;
  isLevel?: boolean;
};

/** 촬영 가이드 — 코너 + 줄자선만 기본, 나머지는 토글 */
export default function CaptureOverlay({
  showGrid = false,
  showGuide = false,
  showLevel = false,
  roll = 0,
  isLevel = false,
}: Props) {
  return (
    <View style={styles.container} pointerEvents="none">
      {showGrid ? <GridOverlay /> : null}

      {showLevel ? (
        <View
          style={[
            styles.horizon,
            { transform: [{ rotate: `${-roll}deg` }] },
            isLevel ? styles.horizonOk : null,
          ]}
        />
      ) : null}

      <View style={styles.frame}>
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
        <View style={styles.rulerLine}>
          {showGuide
            ? [0, 0.25, 0.5, 0.75, 1].map((p) => (
                <View key={p} style={[styles.rulerTick, { left: `${p * 100}%` }]} />
              ))
            : null}
        </View>
      </View>
    </View>
  );
}

function GridOverlay() {
  return (
    <View style={StyleSheet.absoluteFill}>
      {[1, 2].map((i) => (
        <View key={`v${i}`} style={[styles.gridLine, styles.gridV, { left: `${(i / 3) * 100}%` }]} />
      ))}
      {[1, 2].map((i) => (
        <View key={`h${i}`} style={[styles.gridLine, styles.gridH, { top: `${(i / 3) * 100}%` }]} />
      ))}
    </View>
  );
}

const CORNER = 18;
const STROKE = 2;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 24,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  gridV: { top: 0, bottom: 0, width: StyleSheet.hairlineWidth },
  gridH: { left: 0, right: 0, height: StyleSheet.hairlineWidth },
  horizon: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    top: '46%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  horizonOk: {
    backgroundColor: 'rgba(76,217,123,0.85)',
    height: 1.5,
  },
  frame: {
    flex: 1,
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  tl: { top: 0, left: 0, borderTopWidth: STROKE, borderLeftWidth: STROKE },
  tr: { top: 0, right: 0, borderTopWidth: STROKE, borderRightWidth: STROKE },
  bl: { bottom: 0, left: 0, borderBottomWidth: STROKE, borderLeftWidth: STROKE },
  br: { bottom: 0, right: 0, borderBottomWidth: STROKE, borderRightWidth: STROKE },
  rulerLine: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '62%',
    height: 2,
    backgroundColor: colors.accentSky,
    borderRadius: 1,
    opacity: 0.9,
  },
  rulerTick: {
    position: 'absolute',
    top: -6,
    width: 1,
    height: 14,
    marginLeft: -0.5,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
});
