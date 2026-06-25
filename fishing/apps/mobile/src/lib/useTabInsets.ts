import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/theme/layout';

const TAB_BAR_BODY = 56;
const TAB_BAR_PAD = 6;

/** 하단 탭바 + safe area 높이 */
export function useTabBarHeight() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_BODY + TAB_BAR_PAD + Math.max(insets.bottom, 6);
}

/** 스크롤 리스트 하단 여백 (탭바에 가리지 않도록) */
export function useListBottomInset(extra = spacing.lg) {
  const tabBar = useTabBarHeight();
  return tabBar + extra;
}

/** FAB가 있는 화면용 하단 여백 */
export function useListBottomInsetWithFab() {
  const tabBar = useTabBarHeight();
  return tabBar + 56 + spacing.lg;
}
