import { Platform, type TextStyle } from 'react-native';
import { fonts } from './typography';

/** Android 한글 수직 정렬 보정 */
const androidFix: TextStyle = Platform.select({
  android: { includeFontPadding: false, textAlignVertical: 'center' },
  default: {},
}) as TextStyle;

export const text = {
  regular: (size: number): TextStyle => ({
    fontFamily: fonts.regular,
    fontSize: size,
    lineHeight: Math.round(size * 1.45),
    ...androidFix,
  }),
  bold: (size: number): TextStyle => ({
    fontFamily: fonts.bold,
    fontSize: size,
    lineHeight: Math.round(size * 1.45),
    ...androidFix,
  }),
  center: { textAlign: 'center' as const },
};
