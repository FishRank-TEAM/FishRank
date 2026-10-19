/** 랭킹 점수 = length_cm × rarity_weight. 길이가 없으면 null. */
export function computeRankScore(
  lengthCm: unknown,
  rarityWeight: unknown,
  eligible: boolean,
): number | null {
  if (!eligible || lengthCm == null || lengthCm === '') return null;

  const length = typeof lengthCm === 'number' ? lengthCm : Number(lengthCm);
  if (!Number.isFinite(length)) return null;

  const weight = rarityWeight == null || rarityWeight === '' ? 1 : Number(rarityWeight);
  const safeWeight = Number.isFinite(weight) ? weight : 1;
  return Math.round(length * safeWeight * 100) / 100;
}
