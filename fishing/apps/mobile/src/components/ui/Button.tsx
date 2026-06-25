import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import PressableScale from '@/components/ui/PressableScale';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { radius, spacing } from '@/theme/layout';
import { motion, touch } from '@/theme/motion';

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  icon?: React.ReactNode;
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  accessibilityLabel,
  icon,
}: Props) {
  const isDisabled = disabled || loading;
  const variantStyle = styles[variant];

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.base,
        variantStyle,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? colors.oceanBright : '#fff'} />
      ) : (
        <View style={styles.inner}>
          {icon}
          <Text style={[styles.label, variant === 'secondary' || variant === 'ghost' ? styles.labelAlt : null]}>
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch.minTargetAndroid,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  labelAlt: { color: colors.oceanDeep },
  primary: { backgroundColor: colors.oceanBright },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destructive: { backgroundColor: colors.error },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
});
