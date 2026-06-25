import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import UserAvatar from '@/components/ui/UserAvatar';
import { colors } from '@/theme/colors';
import { text } from '@/theme/text';
import { radius, spacing } from '@/theme/layout';

type Props = {
  myRank?: number | null;
};

/** 랭킹 상단 — 컴팩트 프로필 스트립 */
export default function RankingProfileStrip({ myRank }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const nickname = useAuthStore((s) => s.user?.nickname);
  const [expanded, setExpanded] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data.data,
    enabled: isLoggedIn,
    staleTime: 2 * 60_000,
  });

  if (!isLoggedIn) {
    return (
      <View style={[styles.outer, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.guest} onPress={() => router.push('/(auth)/login')}>
          <Ionicons name="log-in-outline" size={18} color={colors.brandNavy} />
          <Text style={styles.guestText}>로그인하고 내 순위를 확인하세요</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    );
  }

  const stats = me?.stats;
  const hasRank = myRank != null;

  return (
    <View style={[styles.outer, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.card}>
        <View style={styles.row}>
          <Pressable
            style={styles.avatarBtn}
            onPress={() => router.push('/(tabs)/my')}
            accessibilityLabel="내 프로필"
          >
            <UserAvatar
              nickname={nickname ?? '낚시인'}
              profileImage={me?.profileImage}
              size={40}
            />
          </Pressable>

          <Pressable
            style={styles.main}
            onPress={() => setExpanded((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
          >
            <View style={styles.textCol}>
              <Text style={styles.nickname} numberOfLines={1}>
                {nickname ?? '낚시인'}
              </Text>
              <View style={[styles.rankPill, hasRank && styles.rankPillActive]}>
                <Ionicons
                  name={hasRank ? 'trophy' : 'flag-outline'}
                  size={11}
                  color={hasRank ? colors.brandNavy : colors.brandGreen}
                />
                <Text style={[styles.rankText, hasRank && styles.rankTextActive]}>
                  {hasRank ? `현재 ${myRank}위` : '이번 주 랭킹 도전'}
                </Text>
              </View>
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        </View>

        {expanded && stats ? (
          <View style={styles.expanded}>
            <View style={styles.statsRow}>
              <Stat label="인증" value={stats.certifiedCount ?? 0} />
              <Stat label="자랑" value={stats.personalCount ?? 0} />
              <Stat label="게시글" value={stats.postCount ?? 0} />
            </View>
            <View style={styles.linkRow}>
              <Pressable
                style={styles.linkBtn}
                onPress={() => router.push('/ranking/regional')}
                accessibilityRole="button"
                accessibilityLabel="지역별 랭킹"
              >
                <Ionicons name="map-outline" size={14} color={colors.brandNavy} />
                <Text style={styles.linkText}>지역</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => router.push('/weather')}>
                <Ionicons name="partly-sunny-outline" size={14} color={colors.brandNavy} />
                <Text style={styles.linkText}>날씨</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => router.push('/tournament')}>
                <Ionicons name="trophy-outline" size={14} color={colors.brandNavy} />
                <Text style={styles.linkText}>대회</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => router.push('/(tabs)/my')}>
                <Ionicons name="person-outline" size={14} color={colors.brandNavy} />
                <Text style={styles.linkText}>내 정보</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const AVATAR = 40;

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.bg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  guest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
  },
  guestText: { flex: 1, ...text.regular(14), color: colors.brandNavy },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.sm,
    minHeight: 56,
  },
  avatarBtn: {
    width: AVATAR + spacing.md * 2,
    height: AVATAR + spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: spacing.md,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    minHeight: 56,
  },
  textCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
    minWidth: 0,
  },
  nickname: { ...text.bold(15), color: colors.textPrimary },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.oceanLight,
  },
  rankPillActive: {
    backgroundColor: colors.badgeBg,
  },
  rankText: { ...text.regular(11), color: colors.brandGreen },
  rankTextActive: { ...text.bold(11), color: colors.brandNavy },
  expanded: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.sectionBg,
  },
  statsRow: { flexDirection: 'row', marginBottom: spacing.sm },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...text.bold(16), color: colors.brandNavy, ...text.center },
  statLabel: { ...text.regular(10), color: colors.textMuted, marginTop: 2, ...text.center },
  linkRow: { flexDirection: 'row', gap: spacing.xs },
  linkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 36,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkText: { ...text.bold(11), color: colors.brandNavy },
});
