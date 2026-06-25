/** 웹 apps/web globals.css :root 토큰 + FishRank 브랜드 */
export const colors = {
  /** 브랜드: 네이비 + 그린 */
  brandNavy: '#1A3A5C',
  brandGreen: '#2E7D52',
  sectionBg: '#F5F7FA',
  destructive: '#DC2626',
  oceanDeep: '#1A3A5C',
  oceanMid: '#234a6e',
  oceanBright: '#2E7D52',
  oceanSky: '#3d9b6a',
  oceanLight: '#e8f5ee',
  oceanMist: '#f0f8ff',
  accentSky: '#48cae4',
  bg: '#F5F7FA',
  surface: '#ffffff',
  surfaceMuted: '#F0F4F8',
  border: '#d4e4ef',
  textPrimary: '#0d2137',
  textSub: '#4a6278',
  textMuted: '#7a94a8',
  error: '#DC2626',
  success: '#2E7D52',
  successBg: '#e6f5ec',
  warning: '#b45309',
  warningBg: '#fff8eb',
  badgeBg: '#e0f2fe',
  badgeText: '#1A3A5C',
  pressed: '#F0F4F8',
} as const;

export const gradients = {
  ocean: [colors.brandNavy, '#234a6e', colors.brandGreen] as const,
  heroOverlay: [
    'rgba(0, 35, 70, 0.72)',
    'rgba(0, 61, 107, 0.55)',
    'rgba(0, 119, 182, 0.4)',
  ] as const,
} as const;
