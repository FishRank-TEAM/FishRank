import { Redirect } from 'expo-router';

/** 더보기 탭 통합 — 내 정보 탭으로 리다이렉트 */
export default function MenuRedirect() {
  return <Redirect href="/(tabs)/my" />;
}
