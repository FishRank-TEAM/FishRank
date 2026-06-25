import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import UserAvatar from '@/components/ui/UserAvatar';
import AppCard from '@/components/ui/AppCard';
import { colors, gradients } from '@/theme/colors';
import { text } from '@/theme/text';
import { radius, shadow, spacing } from '@/theme/layout';

export default function HomeDashboard() {
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const nickname = useAuthStore((s) => s.user?.nickname);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data.data,
    enabled: isLoggedIn,
    staleTime: 2 * 60_000,
  });

  const { data: announcement } = useQuery({
    queryKey: ['announcements', 'latest'],
    queryFn: async () => {
      const res = await api.get('/announcements', { params: { limit: 1 } });
      const list = res.data.data;
      const item = Array.isArray(list) ? list[0] : list?.items?.[0];
      return item ?? null;
    },
    staleTime: 5 * 60_000,
  });

  return (
    <AppCard style={styles.wrap} padded={false}>
      <View style={styles.inner}>
        <View style={styles.topRow}>
          {isLoggedIn ? (
            <UserAvatar
              nickname={nickname ?? '낚시인'}
              profileImage={me?.profileImage}
              size={48}
              onPress={() => router.push('/(tabs)/my')}
            />
          ) : (
            <View style={styles.logoMark}>
              <Ionicons name="fish-outline" size={24} color={colors.oceanBright} />
            </View>
          )}
          <View style={styles.greetBlock}>
            <Text style={styles.greet}>
              {isLoggedIn ? `${nickname ?? '낚시인'}님` : 'FishRank'}
            </Text>
            <Text style={styles.greetSub}>
              {isLoggedIn ? '오늘도 좋은 조황 기원해요' : '공정한 낚시 기록 플랫폼'}
            </Text>
          </View>
        </View>

        {isLoggedIn && me?.stats ? (
          <View style={styles.statsRow}>
            <StatChip label="인증" value={me.stats.certifiedCount ?? 0} />
            <View style={styles.statDivider} />
            <StatChip label="자랑" value={me.stats.personalCount ?? 0} />
            <View style={styles.statDivider} />
            <StatChip label="게시글" value={me.stats.postCount ?? 0} />
          </View>
        ) : null}

        <View style={styles.quickRow}>
          <Pressable
            style={styles.primaryWrap}
            onPress={() => router.push('/(tabs)/capture')}
            accessibilityRole="button"
            accessibilityLabel="인증 촬영"
          >
            <LinearGradient
              colors={[colors.oceanBright, colors.oceanDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryBtn}
            >
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={styles.primaryLabel}>인증 촬영</Text>
            </LinearGradient>
          </Pressable>
          <SecondaryBtn icon="partly-sunny" label="날씨" onPress={() => router.push('/weather')} />
          <SecondaryBtn icon="trophy" label="대회" onPress={() => router.push('/tournament')} />
        </View>

        {announcement ? (
          <Pressable style={styles.notice} onPress={() => router.push('/announcements')}>
            <View style={styles.noticeBadge}>
              <Text style={styles.noticeLabel}>공지</Text>
            </View>
            <Text style={styles.noticeTitle} numberOfLines={1}>
              {announcement.title}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </AppCard>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SecondaryBtn({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.secondaryBtn} onPress={onPress}>
      <Ionicons name={icon} size={17} color={colors.oceanDeep} />
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  inner: { padding: spacing.md },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.oceanLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetBlock: { flex: 1, justifyContent: 'center' },
  greet: { ...text.bold(18), color: colors.oceanDeep },
  greetSub: { ...text.regular(13), color: colors.textMuted, marginTop: 3 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.oceanLight,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
  },
  statChip: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  statValue: { ...text.bold(20), color: colors.oceanDeep, ...text.center },
  statLabel: { ...text.regular(11), color: colors.textMuted, marginTop: 2, ...text.center },
  quickRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' },
  primaryWrap: { flex: 1.4, borderRadius: radius.sm, overflow: 'hidden', ...shadow.soft },
  primaryBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  primaryLabel: { ...text.bold(13), color: '#fff', ...text.center },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  secondaryLabel: { ...text.bold(11), color: colors.oceanDeep, ...text.center },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  noticeBadge: {
    backgroundColor: colors.badgeBg,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  noticeLabel: { ...text.bold(10), color: colors.oceanBright },
  noticeTitle: { flex: 1, ...text.regular(13), color: colors.textSub },
});
