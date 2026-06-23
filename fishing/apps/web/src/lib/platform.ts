/** 줄자 인증 업로드 — 모바일 앱 전용 */
export const IS_CERTIFIED_UPLOAD_ENABLED = false;

/** 자랑(비공식) 기록 업로드 — 웹 PC 포함 */
export const IS_BRAG_UPLOAD_ENABLED = true;

/** @deprecated 인증·자랑 통합 플래그 대신 위 상수 사용 */
export const IS_CATCH_UPLOAD_ENABLED =
  IS_CERTIFIED_UPLOAD_ENABLED && IS_BRAG_UPLOAD_ENABLED;

export const CATCH_UPLOAD_DISABLED_MESSAGE =
  '줄자 인증 기록 업로드는 모바일 앱에서만 가능합니다. 자랑 기록은 웹에서도 올릴 수 있습니다.';

export const BRAG_UPLOAD_DISABLED_MESSAGE =
  '자랑 기록 업로드는 현재 이용할 수 없습니다.';

export function isUploadPathEnabled(path: string): boolean {
  if (path.includes('/upload/personal')) return IS_BRAG_UPLOAD_ENABLED;
  if (path.includes('/upload')) return IS_CERTIFIED_UPLOAD_ENABLED;
  return false;
}
