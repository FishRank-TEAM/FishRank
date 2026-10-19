import { determineGrade, type CaptureRules } from './certification-grade.util';

const passed: CaptureRules = {
  ruleFlat: true,
  ruleVertical: true,
  ruleRuler: true,
  ruleFullBody: true,
};

describe('determineGrade', () => {
  it('줄자·규칙·신뢰도를 모두 통과하면 S', () => {
    const result = determineGrade({
      rulerDetected: true,
      speciesConfidence: 0.7,
      rules: passed,
    });
    expect(result).toMatchObject({ grade: 'S', status: 'approved', rankScoreEligible: true });
  });

  it('신뢰도가 기준 미만이면 A이고 랭킹에는 반영된다', () => {
    const result = determineGrade({
      rulerDetected: true,
      speciesConfidence: 0.69,
      rules: passed,
    });
    expect(result).toMatchObject({ grade: 'A', status: 'approved', rankScoreEligible: true });
  });

  it('신뢰도가 숫자가 아니면 S로 올리지 않는다', () => {
    const result = determineGrade({
      rulerDetected: true,
      speciesConfidence: Number.NaN,
      rules: passed,
    });
    expect(result.grade).toBe('A');
    expect(result.reason).toContain('측정 불가');
    expect(result.rankScoreEligible).toBe(true);
  });

  it('줄자가 없으면 B이고 랭킹에서 제외된다', () => {
    const result = determineGrade({
      rulerDetected: false,
      speciesConfidence: 0.99,
      rules: passed,
    });
    expect(result).toMatchObject({ grade: 'B', status: 'rejected', rankScoreEligible: false });
  });

  it('실패한 촬영 규칙을 이유에 적는다', () => {
    const result = determineGrade({
      rulerDetected: true,
      speciesConfidence: 0.99,
      rules: { ...passed, ruleFullBody: false, ruleVertical: false },
    });
    expect(result.grade).toBe('B');
    expect(result.reason).toContain('수직 촬영');
    expect(result.reason).toContain('머리·꼬리 전체 포함');
  });
});
