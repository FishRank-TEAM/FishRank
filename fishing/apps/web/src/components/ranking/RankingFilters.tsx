'use client';

import { RANKING_PERIOD_TABS, RANKING_SPECIES_LIST, ALL_RANKING_SPECIES_ID } from '@/lib/ranking.constants';
import type { RankingTypeKey } from '@/lib/ranking.constants';

type Props = {
  period: string;
  onPeriodChange: (key: string) => void;
  speciesId: number;
  onSpeciesChange: (id: number) => void;
  rankingType: RankingTypeKey;
};

export default function RankingFilters({
  period,
  onPeriodChange,
  speciesId,
  onSpeciesChange,
  rankingType,
}: Props) {
  const speciesOptions =
    rankingType === 'unofficial'
      ? [{ id: ALL_RANKING_SPECIES_ID, name: '전체' }, ...RANKING_SPECIES_LIST]
      : [...RANKING_SPECIES_LIST];

  return (
    <div className="ranking-filters">
      <div className="ranking-period-tabs">
        {RANKING_PERIOD_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onPeriodChange(tab.key)}
            className={`ranking-period-tab${period === tab.key ? ' active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="ranking-filters-divider" aria-hidden />

      <div className="ranking-species-group">
        <span className="ranking-species-label">어종별</span>
        <div className="ranking-species-pills">
        {speciesOptions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSpeciesChange(s.id)}
            className={`ranking-species-pill${speciesId === s.id ? ' active' : ''}`}
          >
            {s.name}
          </button>
        ))}
        </div>
      </div>
    </div>
  );
}
