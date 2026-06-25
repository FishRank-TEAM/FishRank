import { useEffect, useState, type ReactNode } from 'react';
import { ImageBackground, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/theme/colors';

const HERO_IMAGES = [
  require('../../assets/hero/1.jpg'),
  require('../../assets/hero/2.jpg'),
  require('../../assets/hero/3.jpg'),
];

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  slideshow?: boolean;
};

export default function HeroBackground({ children, style, slideshow = false }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!slideshow) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [slideshow]);

  return (
    <ImageBackground source={HERO_IMAGES[index]} style={[styles.root, style]} resizeMode="cover">
      <LinearGradient
        colors={[...gradients.heroOverlay]}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.8 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
