'use client';

import {
  RANKING_PERIOD_TABS,
  RANKING_SPECIES_CATEGORY_TABS,
  ALL_RANKING_SPECIES_ID,
  filterRankingSpeciesByCategory,
} from '@/lib/ranking.constants';
import type { RankingTypeKey, RankingSpeciesCategory } from '@/lib/ranking.constants';

type Props = {
  period: string;
  onPeriodChange: (key: string) => void;
  speciesId: number;
  onSpeciesChange: (id: number) => void;
  speciesCategory: RankingSpeciesCategory;
  onSpeciesCategoryChange: (category: RankingSpeciesCategory) => void;
  rankingType: RankingTypeKey;
};

export default function RankingFilters({
  period,
  onPeriodChange,
  speciesId,
  onSpeciesChange,
  speciesCategory,
  onSpeciesCategoryChange,
  rankingType,
}: Props) {
  const categorySpecies = filterRankingSpeciesByCategory(speciesCategory);
  const speciesOptions =
    rankingType === 'unofficial'
      ? [{ id: ALL_RANKING_SPECIES_ID, name: '전체' }, ...categorySpecies]
      : [...categorySpecies];

  const handleCategoryChange = (category: RankingSpeciesCategory) => {
    onSpeciesCategoryChange(category);
    const nextList = filterRankingSpeciesByCategory(category);
    const keepCurrent =
      speciesId === ALL_RANKING_SPECIES_ID ||
      nextList.some((s) => s.id === speciesId);
    if (!keepCurrent && nextList.length > 0) {
      onSpeciesChange(nextList[0].id);
    }
  };

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

      <div className="ranking-period-tabs ranking-category-tabs">
        {RANKING_SPECIES_CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleCategoryChange(tab.key)}
            className={`ranking-period-tab${speciesCategory === tab.key ? ' active' : ''}`}
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
