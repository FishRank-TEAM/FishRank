import { Text, StyleSheet, View, type ReactNode, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients } from '@/theme/colors';
import { text } from '@/theme/text';
import { spacing } from '@/theme/layout';

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** hero: 그라데이션 배너 / compact: 타이틀 한 줄만 */
  variant?: 'hero' | 'compact';
  style?: ViewStyle;
};

export default function PageHeader({
  title,
  subtitle,
  action,
  variant = 'hero',
  style,
}: Props) {
  const insets = useSafeAreaInsets();

  if (variant === 'compact') {
    return (
      <View style={[styles.compactWrap, { paddingTop: insets.top + spacing.xs }, style]}>
        <View style={styles.row}>
          <Text style={styles.compactTitle}>{title}</Text>
          {action}
        </View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[...gradients.ocean]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { paddingTop: insets.top + spacing.sm }, style]}
    >
      <View style={styles.row}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  compactWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: colors.bg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 40,
  },
  textBlock: { flex: 1, justifyContent: 'center' },
  title: {
    color: '#fff',
    ...text.bold(22),
    letterSpacing: -0.3,
  },
  compactTitle: {
    ...text.bold(18),
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    ...text.regular(12),
    marginTop: 4,
  },
});
