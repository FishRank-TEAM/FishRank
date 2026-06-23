export type CertificationGrade = 'S' | 'A' | 'B';

export const SPECIES_CONFIDENCE_S_THRESHOLD = 0.7;

export const CAPTURE_RULES = [
  { id: 'flat', label: '바닥에 놓기', desc: '물고기를 평평한 바닥에 놓으세요' },
  { id: 'vertical', label: '위에서 수직 촬영', desc: '카메라를 물고기 바로 위에서 찍으세요' },
  { id: 'ruler', label: '줄자 포함', desc: '줄자와 물고기가 함께 보이게 찍으세요' },
  { id: 'fullBody', label: '머리·꼬리 전체 포함', desc: '물고기 전체가 사진 안에 들어와야 합니다' },
] as const;

export const UPLOAD_CHANNEL_APP = 'app';
export const UPLOAD_CHANNEL_WEB = 'web';
