import { View, Text, StyleSheet } from 'react-native';
import { CAPTURE_RULES } from '@fishrank/shared';

export default function CaptureOverlay() {
  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.frame}>
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
        <View style={styles.rulerGuide} />
        <Text style={styles.hint}>줄자 + 물고기 전체를 프레임 안에</Text>
      </View>
      <View style={styles.rules}>
        {CAPTURE_RULES.map((rule) => (
          <Text key={rule.id} style={styles.ruleText}>
            • {rule.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const CORNER = 24;
const STROKE = 3;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 32,
  },
  frame: {
    flex: 1,
    marginTop: 48,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#48cae4',
  },
  tl: { top: 8, left: 8, borderTopWidth: STROKE, borderLeftWidth: STROKE },
  tr: { top: 8, right: 8, borderTopWidth: STROKE, borderRightWidth: STROKE },
  bl: { bottom: 8, left: 8, borderBottomWidth: STROKE, borderLeftWidth: STROKE },
  br: { bottom: 8, right: 8, borderBottomWidth: STROKE, borderRightWidth: STROKE },
  rulerGuide: {
    position: 'absolute',
    bottom: '35%',
    left: '10%',
    right: '10%',
    height: 4,
    backgroundColor: 'rgba(255,193,7,0.85)',
    borderRadius: 2,
  },
  hint: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  rules: {
    backgroundColor: 'rgba(0,61,107,0.75)',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  ruleText: {
    color: '#e8f4fc',
    fontSize: 12,
  },
});
