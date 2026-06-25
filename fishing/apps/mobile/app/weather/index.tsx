import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Stack } from 'expo-router';
import { api } from '@/lib/api';
import Screen from '@/components/ui/Screen';
import ChipTabs from '@/components/ui/ChipTabs';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { colors } from '@/theme/colors';

const PRESETS = [
  { label: '서울', lat: 37.5665, lng: 126.978 },
  { label: '부산', lat: 35.1796, lng: 129.0756 },
  { label: '제주', lat: 33.4996, lng: 126.5312 },
];

export default function WeatherScreen() {
  const [mode, setMode] = useState<'gps' | string>('gps');
  const [gps, setGps] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsError('위치 권한이 필요합니다. 프리셋을 선택해 주세요.');
        setMode(PRESETS[0].label);
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: '현재 위치',
        });
      } catch {
        setGpsError('GPS를 가져올 수 없습니다.');
        setMode(PRESETS[0].label);
      }
    })();
  }, []);

  const preset = PRESETS.find((p) => p.label === mode);
  const loc =
    mode === 'gps' && gps
      ? gps
      : preset ?? PRESETS[0];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['weather', loc.lat, loc.lng],
    queryFn: async () => {
      const res = await api.get('/weather', {
        params: { lat: loc.lat, lng: loc.lng, label: loc.label },
      });
      return res.data.data;
    },
    enabled: mode !== 'gps' || !!gps,
  });

  const tabs = [
    { key: 'gps', label: '내 위치' },
    ...PRESETS.map((p) => ({ key: p.label, label: p.label })),
  ];

  return (
    <>
      <Stack.Screen options={{ title: '낚시 날씨' }} />
      <Screen>
        <ChipTabs tabs={tabs} active={mode} onChange={setMode} />
        {gpsError && mode === 'gps' ? (
          <Text style={styles.gpsError}>{gpsError}</Text>
        ) : null}
        {isLoading ? (
          <LoadingState message="날씨 불러오는 중..." />
        ) : isError ? (
          <ErrorState title="날씨 API 연결 실패 — 네트워크를 확인해 주세요" onRetry={refetch} />
        ) : (
          <>
            <Text style={styles.location}>{data.location?.label ?? loc.label}</Text>
            {data.current ? (
              <View style={styles.currentCard}>
                <Text style={styles.nowTemp}>{data.current.temperature ?? '-'}°C</Text>
                <Text style={styles.nowSky}>{data.current.skyLabel ?? ''}</Text>
                {data.current.precipitation != null ? (
                  <Text style={styles.nowSub}>강수 {data.current.precipitation}mm</Text>
                ) : null}
              </View>
            ) : null}
            <Text style={styles.chartTitle}>시간별 예보</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
              {(data.days ?? []).flatMap((day: { date: string; slots: { hourLabel: string; temperature?: number; skyLabel?: string }[] }) =>
                (day.slots ?? []).slice(0, 8).map((s, i) => (
                  <View key={`${day.date}-${i}`} style={styles.slot}>
                    <Text style={styles.slotHour}>{s.hourLabel}</Text>
                    <Text style={styles.slotTemp}>{s.temperature ?? '-'}°</Text>
                    <Text style={styles.slotSky} numberOfLines={1}>
                      {s.skyLabel ?? ''}
                    </Text>
                  </View>
                )),
              )}
            </ScrollView>
            {(data.days ?? []).slice(0, 3).map((day: { date: string; slots: { hourLabel: string; temperature?: number; skyLabel?: string }[] }) => (
              <Text key={day.date} style={styles.day}>
                {day.date}
                {'\n'}
                {(day.slots ?? [])
                  .filter((_, i) => i % 3 === 0)
                  .slice(0, 4)
                  .map((s) => `${s.hourLabel} ${s.temperature ?? '-'}°C`)
                  .join(' · ')}
              </Text>
            ))}
            {data.bestTimesToday?.length ? (
              <Text style={styles.best}>
                오늘 추천: {data.bestTimesToday.map((t: { hourLabel: string }) => t.hourLabel).join(', ')}
              </Text>
            ) : null}
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  gpsError: { fontSize: 12, color: colors.error, marginVertical: 8 },
  location: { fontSize: 20, fontWeight: '800', color: colors.oceanDeep, marginTop: 12, marginBottom: 8 },
  currentCard: {
    backgroundColor: colors.oceanLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  nowTemp: { fontSize: 36, fontWeight: '800', color: colors.oceanDeep },
  nowSky: { fontSize: 16, color: colors.textSub, marginTop: 4 },
  nowSub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  chartTitle: { fontSize: 14, fontWeight: '700', color: colors.oceanDeep, marginBottom: 8 },
  chartScroll: { marginBottom: 16 },
  slot: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginRight: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  slotHour: { fontSize: 11, color: colors.textMuted },
  slotTemp: { fontSize: 16, fontWeight: '800', color: colors.oceanDeep, marginVertical: 4 },
  slotSky: { fontSize: 10, color: colors.textSub, maxWidth: 64, textAlign: 'center' },
  day: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  best: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.successBg,
    borderRadius: 8,
    color: colors.success,
    fontWeight: '600',
  },
});
