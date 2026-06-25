import { Text, StyleSheet, type TextStyle, type StyleProp } from 'react-native';
import { colors } from '@/theme/colors';

type Props = {
  size?: number;
  light?: boolean;
  style?: StyleProp<TextStyle>;
};

export default function BrandLogo({ size = 28, light = false, style }: Props) {
  return (
    <Text style={[styles.base, { fontSize: size }, light && styles.light, style]}>
      Fish<Text style={[styles.rank, light && styles.rankLight]}>Rank</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontWeight: '900',
    letterSpacing: -0.5,
    color: colors.oceanDeep,
  },
  rank: {
    color: colors.oceanBright,
  },
  light: {
    color: '#fff',
  },
  rankLight: {
    color: colors.accentSky,
  },
});
