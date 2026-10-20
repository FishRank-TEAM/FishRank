import { buildLiveLeaderboard, leaderboardCsv } from './live-leaderboard.util';

const tournament = {
  fishSpeciesId: 7,
  minLengthCm: 20,
  maxLengthCm: 60,
  startAt: new Date('2026-11-01T00:00:00.000Z'),
  endAt: new Date('2026-11-03T00:00:00.000Z'),
};

function entry(userId: string, extra: Partial<{ disqualified: boolean; paymentStatus: string }> = {}) {
  return {
    id: `entry-${userId}`,
    userId,
    disqualified: extra.disqualified ?? false,
    paymentStatus: extra.paymentStatus ?? 'free',
    user: { id: userId, nickname: userId },
  };
}

function fish(userId: string, lengthCm: number, at: string, extra: Partial<{ fishSpeciesId: number; status: string }> = {}) {
  return {
    id: `${userId}-${lengthCm}`,
    userId,
    lengthCm,
    createdAt: new Date(at),
    fishSpeciesId: extra.fishSpeciesId ?? 7,
    status: extra.status ?? 'approved',
    recordType: 'certified',
  };
}

describe('실시간 대회 순위', () => {
  it('기간·어종·체장에 맞는 가장 긴 기록으로 순위를 매긴다', () => {
    const rows = buildLiveLeaderboard(
      tournament,
      [entry('a'), entry('b'), entry('c', { disqualified: true }), entry('d', { paymentStatus: 'pending' })],
      [
        fish('a', 30, '2026-11-01T01:00:00.000Z'),
        fish('a', 41, '2026-11-01T02:00:00.000Z'),
        fish('b', 41, '2026-11-01T00:30:00.000Z'),
        fish('a', 70, '2026-11-01T03:00:00.000Z'),
        fish('a', 50, '2026-10-31T00:00:00.000Z'),
        fish('b', 55, '2026-11-02T00:00:00.000Z', { fishSpeciesId: 8 }),
        fish('c', 59, '2026-11-01T04:00:00.000Z'),
        fish('d', 58, '2026-11-01T04:00:00.000Z'),
      ],
    );

    expect(rows.map((row) => [row.userId, row.bestLengthCm, row.rank])).toEqual([
      ['b', 41, 1],
      ['a', 41, 2],
    ]);
  });

  it('결과 CSV는 순위와 닉네임을 담는다', () => {
    const csv = leaderboardCsv([
      {
        id: 'e1',
        userId: 'a',
        user: { id: 'a', nickname: '홍,길동' },
        bestLengthCm: 41,
        bestCatchId: 'catch-1',
        rank: 1,
      },
    ]);
    expect(csv).toBe('rank,nickname,length_cm,catch_id\n1,"홍,길동",41,catch-1');
  });
});
