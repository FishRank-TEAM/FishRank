'use client';

import RegionalRankingMap from '@/components/map/RegionalRankingMap';
import { useRankingFilters } from '@/components/ranking/RankingFilterContext';

export default function RegionalRankingPage() {
  const { period, speciesId, rankingType } = useRankingFilters();

  return (
    <div className="ranking-panel ranking-panel-regional">
      <RegionalRankingMap period={period} speciesId={speciesId} rankingType={rankingType} />
    </div>
  );
}
