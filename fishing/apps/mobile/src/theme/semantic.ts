/** 피드백 상태 색 — 색상+아이콘+텍스트 3채널용 */
export const semantic = {
  success: { fg: '#1a7f5a', bg: '#e6f5f0', border: '#b8e6d4', icon: 'checkmark-circle' as const },
  warning: { fg: '#b45309', bg: '#fff8eb', border: '#fcd9a0', icon: 'warning' as const },
  error: { fg: '#c0392b', bg: '#fdecea', border: '#f5c4be', icon: 'close-circle' as const },
  info: { fg: '#0369a1', bg: '#e8f4fc', border: '#b8ddf5', icon: 'information-circle' as const },
} as const;
