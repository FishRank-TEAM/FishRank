import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HeroBackground from '@/components/HeroBackground';
import { spacing } from '@/theme/layout';

type Props = {
  hero: ReactNode;
  children: ReactNode;
  slideshow?: boolean;
};

/**
 * 로그인·회원가입 공통 레이아웃
 * - KeyboardAvoidingView 대신 ScrollView automaticallyAdjustKeyboardInsets (이중 보정 방지)
 * - 키보드 올라올 때 히어로만 축소, 폼은 스크롤로 자연스럽게 노출
 */
export default function AuthScreenLayout({ hero, children, slideshow }: Props) {
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <HeroBackground slideshow={slideshow}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          keyboardOpen && styles.contentKeyboard,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.md,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, keyboardOpen && styles.heroCompact]}>{hero}</View>
        <View style={styles.form}>{children}</View>
      </ScrollView>
    </HeroBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    minHeight: '100%',
  },
  contentKeyboard: {
    justifyContent: 'flex-start',
  },
  hero: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  heroCompact: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  form: {
    width: '100%',
  },
});
