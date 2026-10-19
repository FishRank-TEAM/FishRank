/** 공식 랭킹: 점수 내림차순, 동점이면 먼저 등록한 기록이 위. */
export const OFFICIAL_RANK_ORDER = [
  { rankScore: 'desc' as const },
  { createdAt: 'asc' as const },
];

export function compareOfficialRank(
  a: { rankScore: unknown; createdAt: Date },
  b: { rankScore: unknown; createdAt: Date },
): number {
  const diff = Number(b.rankScore) - Number(a.rankScore);
  if (diff !== 0) return diff;
  return a.createdAt.getTime() - b.createdAt.getTime();
}
