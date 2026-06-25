import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import MenuRow from '@/components/ui/MenuRow';
import { useAuthStore } from '@/store/auth.store';
import {
  prefetchAnnouncements,
  prefetchEncyclopedia,
  prefetchRankings,
  prefetchTournaments,
  prefetchWeather,
} from '@/lib/prefetch';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { spacing } from '@/theme/layout';

const WEATHER_PRESET = { lat: 37.5665, lng: 126.978, label: '서울' };

/** 마이 탭 하단 — 기존 더보기 메뉴 (IA: 4탭, 3뎁스 이내) */
export default function AppMenuSection() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>낚시 정보</Text>
      <MenuRow
        icon="map-outline"
        title="지역별 랭킹"
        subtitle="시·도별 낚시왕"
        onPressIn={() => void prefetchRankings()}
        onPress={() => router.push('/ranking/regional')}
      />
      <MenuRow
        icon="partly-sunny-outline"
        title="낚시 날씨"
        onPressIn={() =>
          void prefetchWeather(WEATHER_PRESET.lat, WEATHER_PRESET.lng, WEATHER_PRESET.label)
        }
        onPress={() => router.push('/weather')}
      />
      <MenuRow
        icon="trophy-outline"
        title="낚시 대회"
        onPressIn={() => void prefetchTournaments()}
        onPress={() => router.push('/tournament')}
      />
      <MenuRow
        icon="book-outline"
        title="어종 사전"
        onPressIn={() => void prefetchEncyclopedia()}
        onPress={() => router.push('/encyclopedia')}
      />
      <MenuRow icon="ribbon-outline" title="낚시 정보 · 매듭" onPress={() => router.push('/fishing-info')} />
      <MenuRow
        icon="megaphone-outline"
        title="공지 · 이벤트"
        onPressIn={() => void prefetchAnnouncements()}
        onPress={() => router.push('/announcements')}
      />
      {isAdmin ? (
        <MenuRow icon="settings-outline" title="관리자" onPress={() => router.push('/admin')} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    fontFamily: fonts.bold,
  },
});
