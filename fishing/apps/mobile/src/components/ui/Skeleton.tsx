import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  style?: ViewStyle;
  round?: number;
};

export function SkeletonBlock({ width = '100%', height = 16, style, round = 6 }: Props) {
  return (
    <View
      style={[
        styles.block,
        { width, height, borderRadius: round },
        style,
      ]}
    />
  );
}

export function CatchDetailSkeleton() {
  return (
    <View style={styles.wrap}>
      <SkeletonBlock height={260} round={12} />
      <View style={styles.row}>
        <SkeletonBlock width={64} height={24} />
        <SkeletonBlock width={48} height={24} />
      </View>
      <SkeletonBlock width="60%" height={24} style={{ marginTop: 12 }} />
      <SkeletonBlock width="40%" height={14} style={{ marginTop: 8 }} />
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.infoRow}>
          <SkeletonBlock width={48} height={14} />
          <SkeletonBlock width="70%" height={14} />
        </View>
      ))}
    </View>
  );
}

export function ListRowSkeleton() {
  return (
    <View style={styles.listRow}>
      <SkeletonBlock width={52} height={52} round={8} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBlock width="80%" height={14} />
        <SkeletonBlock width="50%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.surfaceMuted },
  wrap: { padding: 16, gap: 4 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  infoRow: { flexDirection: 'row', gap: 12, marginTop: 12, alignItems: 'center' },
  listRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
