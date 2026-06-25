import { Text, StyleSheet } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import Screen from '@/components/ui/Screen';
import MenuRow from '@/components/ui/MenuRow';
import { KNOTS } from '@/data/knots';
import { colors } from '@/theme/colors';

export default function FishingInfoScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: '낚시 정보' }} />
      <Screen>
        <Text style={styles.intro}>매듭·법규·안전 수칙 등 낚시에 필요한 정보</Text>
        <MenuRow
          icon="🪢"
          title="매듭 가이드"
          subtitle={`${KNOTS.length}개 매듭`}
          onPress={() => router.push('/fishing-info/knots')}
        />
        <Text style={styles.section}>추천 매듭</Text>
        {KNOTS.slice(0, 4).map((knot) => (
          <MenuRow
            key={knot.slug}
            icon="🔗"
            title={knot.nameKo}
            subtitle={knot.difficulty}
            onPress={() => router.push(`/fishing-info/knots/${knot.slug}`)}
          />
        ))}
        <Text style={styles.note}>
          금지구역·어종별 법정 크기 등 상세 법규는 웹 fishrank에서 확인할 수 있습니다.
        </Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: colors.textSub, marginBottom: 16, lineHeight: 20 },
  section: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginVertical: 8 },
  note: { fontSize: 12, color: colors.textMuted, marginTop: 16, lineHeight: 18 },
});
