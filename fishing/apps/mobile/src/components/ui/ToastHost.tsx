import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore, toastSemantic, type ToastType } from '@/store/toast.store';
import { fonts } from '@/theme/typography';
import { radius, shadow, spacing } from '@/theme/layout';
import { touch } from '@/theme/motion';

export default function ToastHost() {
  const insets = useSafeAreaInsets();
  const queue = useToastStore((s) => s.queue);
  const dismiss = useToastStore((s) => s.dismiss);

  if (!queue.length) return null;
  const current = queue[queue.length - 1];
  const sem = toastSemantic(current.type);

  return (
    <View
      style={[styles.host, { top: insets.top + spacing.sm }]}
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
    >
      <View
        style={[styles.toast, { backgroundColor: sem.bg, borderColor: sem.border }, shadow.card]}
        accessibilityRole="alert"
      >
        <Ionicons
          name={sem.icon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={sem.fg}
          accessibilityLabel={typeLabel(current.type)}
        />
        <Text style={[styles.message, { color: sem.fg }]}>{current.message}</Text>
        {current.persistent ? (
          <Pressable
            onPress={() => dismiss(current.id)}
            hitSlop={8}
            accessibilityLabel="알림 닫기"
            style={styles.close}
          >
            <Ionicons name="close" size={18} color={sem.fg} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function typeLabel(type: ToastType): string {
  switch (type) {
    case 'success':
      return '성공';
    case 'error':
      return '오류';
    case 'warning':
      return '경고';
    default:
      return '안내';
  }
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: touch.minTarget,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: fonts.regular,
  },
  close: {
    minWidth: touch.minTarget,
    minHeight: touch.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
