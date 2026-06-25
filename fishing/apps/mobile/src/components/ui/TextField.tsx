import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { radius, spacing } from '@/theme/layout';
import { touch } from '@/theme/motion';

type Props = TextInputProps & {
  label: string;
  error?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
};

export default function TextField({
  label,
  error,
  required,
  value,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const floated = focused || Boolean(value);

  return (
    <View style={[styles.wrap, containerStyle]}>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          error ? styles.fieldError : null,
        ]}
      >
        <Text
          style={[styles.label, floated && styles.labelFloated, error && styles.labelError]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {label}
          {required ? ' *' : ''}
        </Text>
        <TextInput
          style={styles.input}
          value={value}
          placeholder=""
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={`${label}${required ? ', 필수' : ''}`}
          {...rest}
        />
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  field: {
    minHeight: touch.minTargetAndroid,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    justifyContent: 'center',
  },
  fieldFocused: { borderColor: colors.oceanBright },
  fieldError: { borderColor: colors.error },
  label: {
    position: 'absolute',
    left: spacing.md,
    top: 16,
    fontSize: 15,
    color: colors.textMuted,
    fontFamily: fonts.regular,
  },
  labelFloated: {
    top: 6,
    fontSize: 11,
    color: colors.oceanBright,
    fontFamily: fonts.bold,
  },
  labelError: { color: colors.error },
  input: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    fontFamily: fonts.regular,
    padding: 0,
    margin: 0,
  },
  error: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.error,
    fontFamily: fonts.regular,
    lineHeight: 18,
  },
});
