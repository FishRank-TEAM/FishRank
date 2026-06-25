import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import { colors } from '@/theme/colors';
import { semantic } from '@/theme/semantic';
import { fonts } from '@/theme/typography';
import { spacing } from '@/theme/layout';

export function LoadingState({ message = '불러오는 중...' }: { message?: string }) {
  return (
    <View style={styles.center} accessibilityLabel={message} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.oceanBright} />
      <Text style={styles.muted}>{message}</Text>
    </View>
  );
}

export function EmptyState({
  icon = 'fish-outline',
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.center}>
      <View style={[styles.iconCircle, { backgroundColor: semantic.info.bg }]}>
        <Ionicons name={icon} size={28} color={semantic.info.fg} accessibilityLabel="" />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.muted}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorState({
  title = '불러오지 못했습니다',
  description = '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.center} accessibilityRole="alert">
      <View style={[styles.iconCircle, { backgroundColor: semantic.error.bg }]}>
        <Ionicons name="cloud-offline-outline" size={28} color={semantic.error.fg} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.muted}>{description}</Text>
      {onRetry ? (
        <View style={styles.action}>
          <Button label="다시 시도" onPress={onRetry} fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.sm },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    fontFamily: fonts.bold,
    lineHeight: 24,
  },
  muted: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fonts.regular,
    maxWidth: 280,
  },
  action: { marginTop: spacing.md },
});
