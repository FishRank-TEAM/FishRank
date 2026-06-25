import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';
import { text } from '@/theme/text';
import { radius, spacing } from '@/theme/layout';

type Tab = { key: string; label: string };

type Props = {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  compact?: boolean;
  /** 페이드 그라데이션 끝 색 (기본: surface) */
  fadeTo?: string;
};

function SpeciesChip({
  tab,
  active,
  onChange,
  compact,
}: {
  tab: Tab;
  active: string;
  onChange: (key: string) => void;
  compact?: boolean;
}) {
  const isActive = active === tab.key;
  return (
    <Pressable
      style={[styles.chip, compact && styles.chipCompact, isActive && styles.chipActive]}
      onPress={() => onChange(tab.key)}
    >
      <Text style={[styles.chipText, compact && styles.chipTextCompact, isActive && styles.chipTextActive]}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

/** 어종 필터 — 우측 페이드로 가로 스크롤 힌트 */
export default function SpeciesChipScroll({ tabs, active, onChange, compact, fadeTo }: Props) {
  const fadeColor = fadeTo ?? colors.surface;
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {tabs.map((tab) => (
          <SpeciesChip key={tab.key} tab={tab} active={active} onChange={onChange} compact={compact} />
        ))}
      </ScrollView>
      <LinearGradient
        colors={['rgba(255,255,255,0)', fadeColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fade}
        pointerEvents="none"
      />
    </View>
  );
}

const CHIP_H = 40;
const CHIP_H_COMPACT = 34;

const styles = StyleSheet.create({
  wrap: { position: 'relative', marginBottom: spacing.xs },
  wrapCompact: { marginBottom: 0 },
  content: { alignItems: 'center', gap: spacing.sm, paddingRight: 40, paddingVertical: 2 },
  fade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
  },
  chip: {
    minHeight: CHIP_H,
    minWidth: 56,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipCompact: {
    minHeight: CHIP_H_COMPACT,
    minWidth: 48,
    paddingHorizontal: 12,
  },
  chipActive: {
    backgroundColor: colors.brandNavy,
    borderColor: colors.brandNavy,
  },
  chipText: { ...text.regular(13), color: colors.textSub, ...text.center },
  chipTextCompact: { ...text.regular(12) },
  chipTextActive: { ...text.bold(13), color: '#fff', ...text.center },
});
