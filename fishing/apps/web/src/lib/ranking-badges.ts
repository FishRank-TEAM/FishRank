export function getRankBadgeClass(rank: number): string {
  if (rank === 1) return 'rank-badge rank-badge-gold';
  if (rank === 2) return 'rank-badge rank-badge-silver';
  if (rank === 3) return 'rank-badge rank-badge-bronze';
  return 'rank-badge rank-badge-plain';
}
