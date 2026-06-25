'use client';

import Link from 'next/link';
import { getImageUrl } from '@/lib/images';
import { formatLength } from '@/lib/utils';
import RankingCard from '@/components/RankingCard';
import RankingEmptyState from '@/components/ranking/RankingEmptyState';
import UserAvatar from '@/components/ui/UserAvatar';
import type { RegionalKingSummary } from '@/components/map/RegionPolygonLayer';

type Props = {
  regionKey: string | null;
  regionName: string;
  kingSummary: RegionalKingSummary | null;
  detailRankings: Array<Record<string, unknown>> | null;
  isLoadingDetail: boolean;
  embedded?: boolean;
};

export default function RegionalKingPanel({
  regionKey,
  regionName,
  kingSummary,
  detailRankings,
  isLoadingDetail,
  embedded = false,
}: Props) {
  const Wrapper = embedded ? 'section' : 'aside';
  const panelClass = embedded ? 'regional-king-section' : 'regional-king-panel';

  if (!regionKey) {
    return (
      <Wrapper className={panelClass}>
        <div className="regional-king-loading">불러오는 중...</div>
      </Wrapper>
    );
  }

  const king = kingSummary?.king;

  return (
    <Wrapper className={panelClass}>
      <header className="regional-king-panel-header">
        <h3 className="regional-king-panel-title">{regionName}</h3>
        {kingSummary && (
          <p className="regional-king-panel-count">인증 기록 {kingSummary.recordCount}건</p>
        )}
      </header>

      {king ? (
        <div className="regional-king-card">
          <p className="regional-king-badge">👑 {regionName} 낚시왕</p>
          <div className="regional-king-profile">
            <div className="regional-king-avatar">
              <UserAvatar
                nickname={king.user.nickname}
                profileImage={king.user.profileImage}
                className="user-avatar-fill"
              />
            </div>
            <div className="regional-king-info">
              <Link href={`/profile/${king.user.nickname}`} className="regional-king-name">
                {king.user.nickname}
              </Link>
              <p className="regional-king-stats">
                {king.fishSpecies?.nameKo && <span>{king.fishSpecies.nameKo} · </span>}
                <strong>{formatLength(Number(king.lengthCm))}</strong>
                {king.grade && <span> · AI {king.grade}</span>}
              </p>
            </div>
          </div>
          {king.catch?.imageUrl && (
            <div className="regional-king-photo">
              <img src={getImageUrl(king.catch.imageUrl) ?? ''} alt="대표 기록" />
            </div>
          )}
        </div>
      ) : (
        <RankingEmptyState
          compact
          icon="🐟"
          title="이 지역 첫 낚시왕을 노려보세요"
          ctaHref="/upload"
          ctaLabel="첫 기록 남기기"
        />
      )}

      <section className="regional-king-rankings-section">
        <h4 className="regional-king-rankings-title">{regionName} TOP</h4>
        {isLoadingDetail ? (
          <p className="regional-king-loading">불러오는 중...</p>
        ) : detailRankings && detailRankings.length > 0 ? (
          <div className="regional-king-rankings">
            {detailRankings.map((item: any) => (
              <RankingCard key={item.catch.id} item={item} />
            ))}
          </div>
        ) : (
          <RankingEmptyState
            compact
            icon="📊"
            title="표시할 랭킹이 없어요"
            ctaHref="/upload/personal"
            ctaLabel="자랑 기록 올리기"
          />
        )}
      </section>
    </Wrapper>
  );
}
