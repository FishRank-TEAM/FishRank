import { Image, View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { getImageUrl } from '@/lib/images';
import { colors } from '@/theme/colors';

type Props = {
  imageUrl?: string | null;
  size?: number;
  style?: ViewStyle;
};

export default function CatchThumb({ imageUrl, size = 48, style }: Props) {
  const uri = getImageUrl(imageUrl);
  if (!uri) {
    return (
      <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 6 }, style]}>
        <Text style={{ fontSize: size * 0.4 }}>🐟</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={[{ width: size, height: size, borderRadius: size / 6 }, style]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.oceanLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
