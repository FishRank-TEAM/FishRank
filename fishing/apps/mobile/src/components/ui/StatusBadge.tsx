import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { text } from '@/theme/text';
import { radius, spacing } from '@/theme/layout';

type Status = 'approved' | 'rejected' | 'pending';

const CONFIG: Record<
  Status,
  { label: string; bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  approved: { label: '승인됨', bg: colors.successBg, fg: colors.success, icon: 'checkmark-circle' },
  rejected: { label: '거절됨', bg: '#fdecea', fg: colors.destructive, icon: 'close-circle' },
  pending: { label: '검토중', bg: colors.warningBg, fg: colors.warning, icon: 'time' },
};

type Props = {
  status: string;
};

export function RecordStatusBadge({ status }: Props) {
  const key = (['approved', 'rejected', 'pending'].includes(status) ? status : 'pending') as Status;
  const cfg = CONFIG[key];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={12} color={cfg.fg} />
      <Text style={[styles.label, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}

const GRADE_STYLE: Record<string, { bg: string; fg: string }> = {
  S: { bg: '#d4a017', fg: '#fff' },
  A: { bg: '#94a3b8', fg: '#fff' },
  B: { bg: '#c97b3a', fg: '#fff' },
};

export function GradeBadge({ grade }: { grade: string }) {
  const style = GRADE_STYLE[grade.toUpperCase()] ?? { bg: colors.badgeBg, fg: colors.badgeText };
  return (
    <View style={[styles.grade, { backgroundColor: style.bg }]}>
      <Text style={[styles.gradeText, { color: style.fg }]}>{grade}</Text>
    </View>
  );
}

export function PostTypeBadge({ type }: { type: 'certified' | 'brag' | 'general' }) {
  if (type === 'general') return null;
  const isCert = type === 'certified';
  return (
    <View style={[styles.badge, { backgroundColor: isCert ? colors.badgeBg : colors.successBg }]}>
      <Ionicons
        name={isCert ? 'ribbon' : 'camera'}
        size={11}
        color={isCert ? colors.brandNavy : colors.brandGreen}
      />
      <Text style={[styles.label, { color: isCert ? colors.brandNavy : colors.brandGreen }]}>
        {isCert ? '인증' : '자랑'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: { ...text.bold(11) },
  grade: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    minWidth: 26,
    alignItems: 'center',
  },
  gradeText: { ...text.bold(11), ...text.center },
});
