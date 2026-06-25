import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { text } from '@/theme/text';
import { radius, shadow, spacing } from '@/theme/layout';

export type RankingScope = 'national' | 'regional';

type Props = {
  active: RankingScope;
  onNational: () => void;
  onRegional: () => void;
};

/** 전국 / 지역별 랭킹 전환 — 웹 RankingTabs 와 동일 IA */
export default function RankingScopeTabs({ active, onNational, onRegional }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="tablist" accessibilityLabel="랭킹 범위">
      <ScopeTab
        label="전국"
        icon="globe-outline"
        selected={active === 'national'}
        onPress={onNational}
      />
      <ScopeTab
        label="지역별"
        icon="map-outline"
        selected={active === 'regional'}
        onPress={onRegional}
      />
    </View>
  );
}

function ScopeTab({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.tab, selected && styles.tabActive]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} 랭킹`}
    >
      <Ionicons
        name={icon}
        size={15}
        color={selected ? colors.brandNavy : colors.textMuted}
      />
      <Text style={[styles.tabText, selected && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabActive: {
    borderColor: colors.brandGreen,
    backgroundColor: colors.oceanLight,
    ...shadow.soft,
  },
  tabText: { ...text.regular(14), color: colors.textSub },
  tabTextActive: { ...text.bold(14), color: colors.brandNavy },
});
