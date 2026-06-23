'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import RankingCard from '@/components/RankingCard';
import RankingEmptyState from '@/components/ranking/RankingEmptyState';
import RankingHighlightCard from '@/components/ranking/RankingHighlightCard';
import RankingPodium from '@/components/ranking/RankingPodium';
import UnofficialRankingSidebar from '@/components/ranking/UnofficialRankingSidebar';
import { useRankingFilters } from '@/components/ranking/RankingFilterContext';
import { getSpeciesLabel, ALL_RANKING_SPECIES_ID } from '@/lib/ranking.constants';

export default function RankingPage() {
  const { period, speciesId, rankingType } = useRankingFilters();
  const speciesLabel = getSpeciesLabel(speciesId);

  const { data, isLoading, error } = useQuery({
    queryKey: ['rankings', period, speciesId, rankingType],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        periodType: period,
        limit: 20,
        rankingType,
      };
      if (speciesId > ALL_RANKING_SPECIES_ID) {
        params.speciesId = speciesId;
      }
      const res = await api.get('/rankings', { params });
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="ranking-panel ranking-panel-national">
        <div className="ranking-panel-loading">랭킹 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ranking-panel ranking-panel-national">
        <RankingEmptyState
          icon="⚠️"
          title="서버에 연결할 수 없습니다"
          description="백엔드 서버를 실행한 뒤 다시 시도해 주세요"
        />
      </div>
    );
  }

  if (!data?.rankings?.length) {
    return (
      <div className="ranking-panel ranking-panel-national">
        <RankingEmptyState
          icon={rankingType === 'unofficial' ? '📷' : '🎣'}
          title={
            rankingType === 'unofficial'
              ? `${speciesLabel} 자랑 기록이 없어요`
              : `${speciesLabel} 인증 기록이 없어요`
          }
          description={
            rankingType === 'unofficial'
              ? '사진을 올리고 다른 낚시인의 추천을 받아보세요'
              : '줄자 인증 기록을 올리면 랭킹에 반영됩니다'
          }
          ctaHref={rankingType === 'unofficial' ? '/upload/personal' : '/upload'}
          ctaLabel="첫 기록 남기기"
        />
      </div>
    );
  }

  const isUnofficial = rankingType === 'unofficial';
  const highlightItem = data.highlight ?? data.rankings[0];
  const topThree = data.rankings.slice(0, 3);
  const restRankings = data.rankings.slice(3);

  return (
    <div className="ranking-panel ranking-panel-national">
      <div className={`ranking-national-layout${isUnofficial ? ' ranking-national-layout-brag' : ''}`}>
        <div className="ranking-national-main">
          {topThree.length > 0 && (
            <RankingPodium items={topThree} rankingType={rankingType} />
          )}
          <div className="ranking-list">
            {restRankings.map((item: Parameters<typeof RankingCard>[0]['item']) => (
              <RankingCard key={item.catch.id} item={item} variant="national" />
            ))}
          </div>
        </div>
        {isUnofficial ? (
          <UnofficialRankingSidebar />
        ) : (
          <RankingHighlightCard
            item={highlightItem}
            rankingType={rankingType}
            speciesLabel={speciesLabel}
          />
        )}
      </div>
    </div>
  );
}
