import { compareOfficialRank, OFFICIAL_RANK_ORDER } from './official-rank';

describe('compareOfficialRank', () => {
  it('점수가 높은 기록이 앞선다', () => {
    const earlier = { rankScore: 10, createdAt: new Date('2026-01-01') };
    const higher = { rankScore: 12, createdAt: new Date('2026-01-02') };
    expect(compareOfficialRank(higher, earlier)).toBeLessThan(0);
  });

  it('동점이면 먼저 등록한 기록이 앞선다', () => {
    const first = { rankScore: 10, createdAt: new Date('2026-01-01') };
    const later = { rankScore: 10, createdAt: new Date('2026-01-03') };
    expect([later, first].sort(compareOfficialRank).map((row) => row.createdAt.toISOString())).toEqual([
      '2026-01-01T00:00:00.000Z',
      '2026-01-03T00:00:00.000Z',
    ]);
  });

  it('조회 정렬도 점수 내림차순 다음 등록 시각 오름차순이다', () => {
    expect(OFFICIAL_RANK_ORDER).toEqual([{ rankScore: 'desc' }, { createdAt: 'asc' }]);
  });
});
