import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import { colors } from '@/theme/colors';
import { text } from '@/theme/text';
import { radius, shadow, spacing } from '@/theme/layout';

type Tab = { key: string; label: string };

type Props = {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  compact?: boolean;
  style?: import('react-native').ViewStyle;
};

/** 2~3개 옵션 — iOS 스타일 세그먼트 컨트롤 */
export function SegmentedTabs({ tabs, active, onChange, compact, style }: Props) {
  return (
    <View style={[styles.segmentTrack, compact && styles.segmentTrackCompact, style]}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={[styles.segment, compact && styles.segmentCompact, isActive && styles.segmentActive]}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.segmentText,
                compact && styles.segmentTextCompact,
                isActive && styles.segmentTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SpeciesChip({
  tab,
  active,
  onChange,
}: {
  tab: Tab;
  active: string;
  onChange: (key: string) => void;
}) {
  const isActive = active === tab.key;
  return (
    <Pressable
      style={[styles.speciesChip, isActive && styles.speciesChipActive]}
      onPress={() => onChange(tab.key)}
    >
      <Text style={[styles.speciesText, isActive && styles.speciesTextActive]}>{tab.label}</Text>
    </Pressable>
  );
}

export default function ChipTabs({ tabs, active, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.rowContent}
    >
      {tabs.map((tab) => (
        <SpeciesChip key={tab.key} tab={tab} active={active} onChange={onChange} />
      ))}
    </ScrollView>
  );
}

/** @deprecated SegmentedTabs 사용 권장 */
export function InlineChipTabs({ tabs, active, onChange }: Props) {
  return <SegmentedTabs tabs={tabs} active={active} onChange={onChange} />;
}

const CHIP_H = 38;
const CHIP_H_COMPACT = 32;

const styles = StyleSheet.create({
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: 3,
    marginBottom: spacing.md,
  },
  segmentTrackCompact: {
    marginBottom: 0,
  },
  segment: {
    flex: 1,
    minHeight: CHIP_H,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm - 2,
    paddingHorizontal: spacing.sm,
  },
  segmentCompact: {
    minHeight: CHIP_H_COMPACT,
    paddingHorizontal: spacing.xs,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.brandGreen,
    ...shadow.soft,
  },
  segmentText: {
    ...text.regular(14),
    color: colors.textSub,
    ...text.center,
  },
  segmentTextCompact: {
    ...text.regular(12),
  },
  segmentTextActive: {
    ...text.bold(14),
    color: colors.oceanDeep,
    ...text.center,
  },
  row: { marginBottom: spacing.xs, flexGrow: 0 },
  rowContent: { alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
  speciesChip: {
    minHeight: CHIP_H,
    minWidth: 52,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  speciesChipActive: {
    backgroundColor: colors.oceanDeep,
    borderColor: colors.oceanDeep,
  },
  speciesText: {
    ...text.regular(13),
    color: colors.textSub,
    ...text.center,
  },
  speciesTextActive: {
    ...text.bold(13),
    color: '#fff',
    ...text.center,
  },
});
