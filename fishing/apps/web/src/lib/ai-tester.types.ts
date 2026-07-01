export type AiHealthData = {
  apiOnline: boolean;
  aiServerOnline: boolean;
  aiServerUrl: string;
  model?: string | null;
  speciesClassifier?: string | null;
  yoloReady?: boolean;
  yoloModelPath?: string | null;
  yoloClassCount?: number | null;
  inferenceVersion?: string | null;
};

export type AiTestRules = {
  ruleFlat: boolean;
  ruleVertical: boolean;
  ruleRuler: boolean;
  ruleFullBody: boolean;
};

export type AiTestAnalysis = {
  catchId: string;
  rulerDetected: boolean;
  rulerLengthCm: number | null;
  rulerStartPx: number | null;
  rulerEndPx: number | null;
  speciesDetected: string;
  speciesConfidence: number;
  speciesMethod?: string;
  speciesDisplayName?: string;
  speciesTopCandidates?: { slug: string; score: number; nameKo?: string }[];
  ruleFlat: boolean;
  ruleVertical: boolean;
  ruleRuler: boolean;
  ruleFullBody: boolean;
  grade: string;
  errorMessage: string | null;
};

export type AiTestResult = {
  catchId: string;
  imageUrl: string;
  processingMs: number;
  analysis: AiTestAnalysis;
  grade: string;
  status: 'approved' | 'rejected';
  gradeReason: string;
  rankScorePreview: number | null;
  species: {
    id: number;
    nameKo: string;
    nameEn: string;
    rarityWeight: unknown;
  } | null;
  rules: AiTestRules;
};

export const AI_SAMPLE_IMAGES = [
  { id: 1, label: '배스 (seed-1)', path: '/uploads/seed-1.jpg' },
  { id: 8, label: '참돔 (seed-8)', path: '/uploads/seed-8.jpg' },
  { id: 9, label: '광어 (seed-9)', path: '/uploads/seed-9.jpg' },
  { id: 10, label: '우럭 (seed-10)', path: '/uploads/seed-10.jpg' },
  { id: 2, label: '쏘가리 (seed-2)', path: '/uploads/seed-2.jpg' },
  { id: 3, label: '가물치 (seed-3)', path: '/uploads/seed-3.jpg' },
] as const;

export const AI_RULE_LABELS: { key: keyof AiTestRules; label: string }[] = [
  { key: 'ruleFlat', label: '바닥에 놓기' },
  { key: 'ruleVertical', label: '수직 촬영' },
  { key: 'ruleRuler', label: '줄자 포함' },
  { key: 'ruleFullBody', label: '머리·꼬리 전체' },
];

export function getStaticAssetUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace(
    /\/api\/v1\/?$/,
    '',
  );
  return `${base}${path}`;
}

export function speciesMethodLabel(method?: string): string {
  if (method === 'yolo') return 'YOLO';
  if (method === 'clip') return 'CLIP';
  if (method === 'hsv') return 'HSV';
  return method ?? '—';
}
