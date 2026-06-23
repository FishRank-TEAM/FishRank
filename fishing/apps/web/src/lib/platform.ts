/** 줄자 인증 업로드 — 모바일 앱 전용 (AR + AI 실시간 촬영) */
export const IS_CERTIFIED_UPLOAD_ENABLED = false;

/** 자랑(비공식) 기록 업로드 — 웹 PC 포함 */
export const IS_BRAG_UPLOAD_ENABLED = true;

/** @deprecated 인증·자랑 통합 플래그 대신 위 상수 사용 */
export const IS_CATCH_UPLOAD_ENABLED =
  IS_CERTIFIED_UPLOAD_ENABLED && IS_BRAG_UPLOAD_ENABLED;

export const CATCH_UPLOAD_DISABLED_MESSAGE =
  '공식 인증 기록은 모바일 앱에서 AR 가이드 + AI 줄자 인식으로 촬영한 사진만 랭킹에 반영됩니다. 갤러리·웹 업로드는 허용되지 않습니다.';

export const BRAG_UPLOAD_DISABLED_MESSAGE =
  '자랑 기록 업로드는 현재 이용할 수 없습니다.';

/** 앱 전용 인증 정책 — 왜 앱만 허용하는지 */
export const APP_CERTIFIED_REASONS = [
  '앱 카메라에서만 촬영 — 갤러리·미리 찍은 사진 업로드 불가',
  'AR 촬영 가이드 — 줄자·물고기·각도를 실시간으로 맞춤',
  'AI 줄자 인식 + 어종 분류 — 촬영 직후 즉시 검증',
  '동일 기준 적용 — 모든 참가자가 같은 조건에서 촬영',
] as const;

/** 인증 랭킹 형평성 안내 */
export const CERTIFICATION_FAIRNESS_POINTS = [
  '앱 실시간 촬영만 허용 — 갤러리·웹 업로드 불가',
  '동일 사진(해시 일치) 재업로드 차단',
  'B등급은 랭킹 미반영 · 점수 = 길이 × 어종 가중치',
] as const;

export const CERTIFIED_ANTI_FRAUD_HINT =
  '공식 랭킹은 앱 전용 실시간 촬영(AR+AI)으로만 참여할 수 있습니다. 웹에서는 자랑 기록만 올릴 수 있습니다.';

export function isUploadPathEnabled(path: string): boolean {
  if (path.includes('/upload/personal')) return IS_BRAG_UPLOAD_ENABLED;
  if (path.includes('/upload')) return IS_CERTIFIED_UPLOAD_ENABLED;
  return false;
}
