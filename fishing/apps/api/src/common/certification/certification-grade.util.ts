export type CertificationGrade = 'S' | 'A' | 'B';

export const SPECIES_CONFIDENCE_S_THRESHOLD = 0.7;

export type CaptureRules = {
  ruleFlat: boolean;
  ruleVertical: boolean;
  ruleRuler: boolean;
  ruleFullBody: boolean;
};

export type GradeInput = {
  rulerDetected: boolean;
  speciesConfidence: number;
  rules: CaptureRules;
};

export type GradeResult = {
  grade: CertificationGrade;
  status: 'approved' | 'rejected';
  rankScoreEligible: boolean;
  reason: string;
};

export function allRulesPassed(rules: CaptureRules): boolean {
  return rules.ruleFlat && rules.ruleVertical && rules.ruleRuler && rules.ruleFullBody;
}

/** 줄자 인식 + 촬영 규칙 + 어종 신뢰도로 S/A/B 판정 */
export function determineGrade(input: GradeInput): GradeResult {
  const rulesOk = allRulesPassed(input.rules);

  if (!input.rulerDetected) {
    return {
      grade: 'B',
      status: 'rejected',
      rankScoreEligible: false,
      reason: '줄자를 인식하지 못했습니다. 줄자가 선명하게 보이도록 다시 촬영해 주세요.',
    };
  }

  if (!rulesOk) {
    const failed: string[] = [];
    if (!input.rules.ruleFlat) failed.push('바닥에 놓기');
    if (!input.rules.ruleVertical) failed.push('수직 촬영');
    if (!input.rules.ruleRuler) failed.push('줄자 포함');
    if (!input.rules.ruleFullBody) failed.push('머리·꼬리 전체 포함');

    return {
      grade: 'B',
      status: 'rejected',
      rankScoreEligible: false,
      reason: `촬영 규칙 미준수: ${failed.join(', ')}`,
    };
  }

  if (input.speciesConfidence < SPECIES_CONFIDENCE_S_THRESHOLD) {
    return {
      grade: 'A',
      status: 'approved',
      rankScoreEligible: true,
      reason: `어종 AI 신뢰도 ${Math.round(input.speciesConfidence * 100)}% (S등급 기준 ${SPECIES_CONFIDENCE_S_THRESHOLD * 100}% 이상)`,
    };
  }

  return {
    grade: 'S',
    status: 'approved',
    rankScoreEligible: true,
    reason: '모든 검증을 통과했습니다.',
  };
}
