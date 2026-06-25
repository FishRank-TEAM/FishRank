export const fonts = {
  regular: 'NotoSansKR_400Regular',
  bold: 'NotoSansKR_700Bold',
} as const;

export const typography = {
  h1: { fontSize: 24, fontWeight: '800' as const, fontFamily: fonts.bold, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '800' as const, fontFamily: fonts.bold, letterSpacing: -0.2 },
  h3: { fontSize: 16, fontWeight: '700' as const, fontFamily: fonts.bold },
  body: { fontSize: 15, fontWeight: '400' as const, fontFamily: fonts.regular, lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: '500' as const, fontFamily: fonts.regular },
  label: { fontSize: 13, fontWeight: '700' as const, fontFamily: fonts.bold },
} as const;
