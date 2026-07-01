export type AiAnalyzeResult = {
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

export type AiServerHealth = {
  status: string;
  model: string;
  speciesClassifier: string;
  clipModel?: string | null;
  yoloReady?: boolean;
  yoloModelPath?: string | null;
  yoloClassCount?: number | null;
  inferenceVersion?: string | null;
};
