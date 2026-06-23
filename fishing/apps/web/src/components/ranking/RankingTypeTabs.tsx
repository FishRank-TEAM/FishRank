'use client';

import { RANKING_TYPE_TABS, ALL_RANKING_SPECIES_ID, DEFAULT_RANKING_SPECIES_ID } from '@/lib/ranking.constants';
import { useRankingFilters } from '@/components/ranking/RankingFilterContext';
import type { RankingTypeKey } from '@/lib/ranking.constants';

export default function RankingTypeTabs() {
  const { rankingType, setRankingType, speciesId, setSpeciesId } = useRankingFilters();

  const handleTypeChange = (type: RankingTypeKey) => {
    if (type === 'unofficial' && speciesId !== ALL_RANKING_SPECIES_ID) {
      setSpeciesId(ALL_RANKING_SPECIES_ID);
    } else if (type === 'official' && speciesId === ALL_RANKING_SPECIES_ID) {
      setSpeciesId(DEFAULT_RANKING_SPECIES_ID);
    }
    setRankingType(type);
  };

  return (
    <div className="ranking-segment" role="tablist" aria-label="랭킹 유형">
      {RANKING_TYPE_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={rankingType === tab.key}
          className={`ranking-segment-btn${rankingType === tab.key ? ' active' : ''}`}
          onClick={() => handleTypeChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
