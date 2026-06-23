export type CertificationGrade = 'S' | 'A' | 'B';

export const SPECIES_CONFIDENCE_S_THRESHOLD = 0.7;

export const CERTIFICATION_GRADES: {
  grade: CertificationGrade;
  label: string;
  summary: string;
  criteria: string[];
  ranking: string;
}[] = [
  {
    grade: 'S',
    label: 'S등급',
    summary: '최고 신뢰도 — 공식 랭킹 즉시 반영',
    criteria: [
      '촬영 규칙 4가지 모두 통과',
      '줄자 눈금 인식 성공',
      `어종 AI 신뢰도 ${SPECIES_CONFIDENCE_S_THRESHOLD * 100}% 이상`,
    ],
    ranking: '공식 랭킹에 즉시 반영',
  },
  {
    grade: 'A',
    label: 'A등급',
    summary: '인증 반영 — 어종 판별 신뢰도 보통',
    criteria: [
      '촬영 규칙 4가지 모두 통과',
      '줄자 눈금 인식 성공',
      `어종 AI 신뢰도 ${SPECIES_CONFIDENCE_S_THRESHOLD * 100}% 미만`,
    ],
    ranking: '공식 랭킹 반영 (A등급 표시)',
  },
  {
    grade: 'B',
    label: 'B등급',
    summary: '검수 대기 — 랭킹 미반영',
    criteria: [
      '줄자 미인식',
      '또는 촬영 규칙 4가지 중 1개 이상 미준수',
    ],
    ranking: '랭킹 미반영 · 관리자 검수 또는 재촬영',
  },
];

export const CAPTURE_RULES = [
  { id: 'flat', label: '바닥에 놓기', desc: '물고기를 평평한 바닥에 놓으세요' },
  { id: 'vertical', label: '위에서 수직 촬영', desc: '카메라를 물고기 바로 위에서 찍으세요' },
  { id: 'ruler', label: '줄자 포함', desc: '줄자와 물고기가 함께 보이게 찍으세요' },
  { id: 'fullBody', label: '머리·꼬리 전체 포함', desc: '물고기 전체가 사진 안에 들어와야 합니다' },
] as const;
