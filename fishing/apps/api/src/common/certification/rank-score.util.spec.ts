import { computeRankScore } from './rank-score.util';

describe('computeRankScore', () => {
  it('길이와 희귀도 가중치를 소수 둘째 자리로 곱한다', () => {
    expect(computeRankScore(30.5, 1.2, true)).toBe(36.6);
  });

  it('가중치가 없으면 1로 계산한다', () => {
    expect(computeRankScore('40', null, true)).toBe(40);
  });

  it('랭킹 제외이거나 길이가 없으면 null', () => {
    expect(computeRankScore(40, 2, false)).toBeNull();
    expect(computeRankScore(null, 2, true)).toBeNull();
    expect(computeRankScore(Number.NaN, 2, true)).toBeNull();
  });
});
