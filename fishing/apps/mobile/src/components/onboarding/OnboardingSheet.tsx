import { useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import { markOnboardingComplete } from '@/lib/onboarding';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { radius, spacing } from '@/theme/layout';

const STEPS = [
  {
    icon: 'camera' as const,
    title: '인증 촬영',
    body: '줄자와 함께 촬영한 기록으로 공식 랭킹에 도전해 보세요.',
  },
  {
    icon: 'trophy' as const,
    title: '어종별 랭킹 확인',
    body: '주간·전체 랭킹과 지역별 낚시왕을 한눈에 볼 수 있어요. 내 기록은 마이 탭에서 관리합니다.',
  },
  {
    icon: 'chatbubbles' as const,
    title: '커뮤니티에서 정보 공유',
    body: '포인트, 장비, 조황 이야기를 나누고 다른 낚시인의 기록도 구경해 보세요.',
  },
] as const;

type Props = {
  visible: boolean;
  onDone: () => void;
};

export default function OnboardingSheet({ visible, onDone }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  async function finish(goCapture?: boolean) {
    await markOnboardingComplete();
    onDone();
    if (goCapture) router.push('/(tabs)/capture');
  }

  return (
    <Modal visible={visible} animationType="fade" transparent accessibilityViewIsModal>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.iconWrap}>
            <Ionicons name={current.icon} size={36} color={colors.oceanBright} />
          </View>
          <Text style={styles.step}>
            {step + 1} / {STEPS.length}
          </Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>

          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <Button
            label={isLast ? '인증 촬영 시작하기' : '다음'}
            onPress={() => (isLast ? void finish(true) : setStep((s) => s + 1))}
          />
          {isLast ? (
            <Button label="나중에 둘러보기" variant="ghost" onPress={() => void finish()} />
          ) : (
            <Pressable onPress={() => void finish()} accessibilityLabel="온보딩 건너뛰기">
              <Text style={styles.skip}>건너뛰기</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.oceanLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  step: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fonts.regular,
  },
  title: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: colors.oceanDeep,
    fontFamily: fonts.bold,
  },
  body: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSub,
    marginBottom: spacing.md,
    fontFamily: fonts.regular,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.oceanBright, width: 20 },
  skip: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    paddingVertical: spacing.sm,
    fontFamily: fonts.regular,
  },
});
