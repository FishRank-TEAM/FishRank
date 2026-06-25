/** 애니메이션·터치 피드백 토큰 */
export const motion = {
  pressScale: 0.95,
  pressDurationMs: 100,
  pageTransitionMs: 200,
  toastAutoDismissMs: 3000,
  toastErrorDismissMs: 0, // 0 = 수동 닫기
} as const;

export const touch = {
  minTarget: 44,
  minTargetAndroid: 48,
  gap: 8,
} as const;
