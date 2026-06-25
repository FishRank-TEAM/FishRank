import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { radius, shadow, spacing } from '@/theme/layout';

type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  onPressIn?: () => void;
};

export default function MenuRow({ icon, title, subtitle, onPress, onPressIn }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
      onPressIn={onPressIn}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={colors.oceanBright} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...shadow.soft,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.oceanLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.bold },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontFamily: fonts.regular },
});
