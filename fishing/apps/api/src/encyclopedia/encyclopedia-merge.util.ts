type TipRow = {
  season: string | null;
  bait: string | null;
  technique: string | null;
  habitat: string | null;
  note: string | null;
  summary: string | null;
  imageUrl: string | null;
};

type OfficialBasic = {
  imageUrl: string | null;
  season: string | null;
  bait: string | null;
  technique: string | null;
  habitat: string | null;
  summary: string | null;
  avgLengthCm: number | null;
};

export type MergedBasicInfo = OfficialBasic & {
  filledByCommunity: {
    imageUrl: boolean;
    season: boolean;
    bait: boolean;
    technique: boolean;
    habitat: boolean;
    summary: boolean;
  };
  needsFill: {
    imageUrl: boolean;
    season: boolean;
    bait: boolean;
    technique: boolean;
    habitat: boolean;
    summary: boolean;
  };
};

export function mergeBasicInfoWithTips(
  official: OfficialBasic,
  tips: TipRow[],
): MergedBasicInfo {
  const pick = (key: keyof TipRow) => {
    for (const tip of tips) {
      const value = tip[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
  };

  const community = {
    imageUrl: pick('imageUrl'),
    season: pick('season'),
    bait: pick('bait'),
    technique: pick('technique'),
    habitat: pick('habitat'),
    summary: pick('summary') ?? pick('note'),
  };

  const merged: MergedBasicInfo = {
    imageUrl: community.imageUrl ?? official.imageUrl,
    season: community.season ?? official.season,
    bait: community.bait ?? official.bait,
    technique: community.technique ?? official.technique,
    habitat: community.habitat ?? official.habitat,
    summary: community.summary ?? official.summary,
    avgLengthCm: official.avgLengthCm,
    filledByCommunity: {
      imageUrl: !!community.imageUrl,
      season: !!community.season,
      bait: !!community.bait,
      technique: !!community.technique,
      habitat: !!community.habitat,
      summary: !!community.summary,
    },
    needsFill: {
      imageUrl: !official.imageUrl && !community.imageUrl,
      season: !official.season && !community.season,
      bait: !official.bait && !community.bait,
      technique: !official.technique && !community.technique,
      habitat: !official.habitat && !community.habitat,
      summary: !official.summary && !community.summary,
    },
  };

  return merged;
}

export function isGenericSummary(summary: string | null, nameKo: string): boolean {
  if (!summary) return true;
  const generic = `${nameKo}은 `;
  const generic2 = `${nameKo}는 `;
  return (
    summary.startsWith(generic) ||
    summary.startsWith(generic2) ||
    summary.endsWith('에서 만날 수 있는 어종이에요.')
  );
}
