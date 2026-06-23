'use client';

import RegionalKingPanel from '@/components/map/RegionalKingPanel';
import type { RegionalKingSummary } from '@/components/map/RegionPolygonLayer';

type Props = {
  regionKey: string | null;
  regionName: string;
  kingSummary: RegionalKingSummary | null;
  detailRankings: Array<Record<string, unknown>> | null;
  isLoadingDetail: boolean;
};

export default function RegionalSidebar({
  regionKey,
  regionName,
  kingSummary,
  detailRankings,
  isLoadingDetail,
}: Props) {
  return (
    <aside className="regional-sidebar">
      <RegionalKingPanel
        regionKey={regionKey}
        regionName={regionName}
        kingSummary={kingSummary}
        detailRankings={detailRankings}
        isLoadingDetail={isLoadingDetail}
        embedded
      />
    </aside>
  );
}
