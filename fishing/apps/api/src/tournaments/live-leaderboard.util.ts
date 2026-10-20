export type LeaderboardCatch = {
  id: string;
  userId: string;
  lengthCm: number;
  createdAt: Date;
  fishSpeciesId?: number | null;
  status?: string;
  recordType?: string;
  deletedAt?: Date | null;
};

export type LeaderboardEntry = {
  id: string;
  userId: string;
  disqualified: boolean;
  paymentStatus: string;
  user: { id: string; nickname: string; profileImage?: string | null };
};

export type LeaderboardTournament = {
  fishSpeciesId?: number | null;
  minLengthCm?: number | null;
  maxLengthCm?: number | null;
  startAt: Date;
  endAt: Date;
};

export type LeaderboardRow = {
  id: string;
  userId: string;
  user: LeaderboardEntry['user'];
  bestLengthCm: number;
  bestCatchId: string;
  rank: number;
};

export function buildLiveLeaderboard(
  tournament: LeaderboardTournament,
  entries: LeaderboardEntry[],
  catches: LeaderboardCatch[],
): LeaderboardRow[] {
  const eligible = new Map(
    entries
      .filter((entry) => !entry.disqualified && (entry.paymentStatus === 'free' || entry.paymentStatus === 'paid'))
      .map((entry) => [entry.userId, entry]),
  );
  const best = new Map<string, LeaderboardCatch>();

  for (const catch_ of catches) {
    if (!eligible.has(catch_.userId) || !Number.isFinite(catch_.lengthCm)) continue;
    if (catch_.deletedAt) continue;
    if (catch_.status && catch_.status !== 'approved') continue;
    if (catch_.recordType && catch_.recordType !== 'certified') continue;
    if (catch_.createdAt < tournament.startAt || catch_.createdAt > tournament.endAt) continue;
    if (tournament.fishSpeciesId && catch_.fishSpeciesId !== tournament.fishSpeciesId) continue;
    if (tournament.minLengthCm != null && catch_.lengthCm < Number(tournament.minLengthCm)) continue;
    if (tournament.maxLengthCm != null && catch_.lengthCm > Number(tournament.maxLengthCm)) continue;

    const current = best.get(catch_.userId);
    const better =
      !current ||
      catch_.lengthCm > current.lengthCm ||
      (catch_.lengthCm === current.lengthCm && catch_.createdAt < current.createdAt);
    if (better) best.set(catch_.userId, catch_);
  }

  return [...best.entries()]
    .map(([userId, catch_]) => ({ entry: eligible.get(userId)!, catch_ }))
    .sort((left, right) => {
      if (right.catch_.lengthCm !== left.catch_.lengthCm) return right.catch_.lengthCm - left.catch_.lengthCm;
      return left.catch_.createdAt.getTime() - right.catch_.createdAt.getTime();
    })
    .map((row, index) => ({
      id: row.entry.id,
      userId: row.entry.userId,
      user: row.entry.user,
      bestLengthCm: row.catch_.lengthCm,
      bestCatchId: row.catch_.id,
      rank: index + 1,
    }));
}

export function leaderboardCsv(rows: LeaderboardRow[]): string {
  const lines = ['rank,nickname,length_cm,catch_id'];
  for (const row of rows) {
    lines.push([row.rank, csvCell(row.user.nickname), row.bestLengthCm, row.bestCatchId].join(','));
  }
  return lines.join('\n');
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
