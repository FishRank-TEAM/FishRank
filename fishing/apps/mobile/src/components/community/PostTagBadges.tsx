import { View, Text, StyleSheet } from 'react-native';
import { getCommunityTagLabel } from '@fishrank/shared';
import { colors } from '@/theme/colors';
import { text } from '@/theme/text';
import { radius } from '@/theme/layout';

type Props = {
  tags?: string[];
  max?: number;
};

export default function PostTagBadges({ tags, max = 3 }: Props) {
  if (!tags?.length) return null;
  const visible = tags.slice(0, max);
  return (
    <View style={styles.row}>
      {visible.map((tag) => (
        <View key={tag} style={styles.badge}>
          <Text style={styles.label}>{getCommunityTagLabel(tag)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    backgroundColor: colors.oceanLight,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: { ...text.bold(10), color: colors.brandNavy },
});
