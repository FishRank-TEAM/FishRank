import { View, StyleSheet, type ViewProps } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/layout';

type Props = ViewProps & {
  padded?: boolean;
};

export default function AppCard({ children, style, padded = true, ...rest }: Props) {
  return (
    <View style={[styles.card, padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  padded: {
    padding: spacing.md,
  },
});
