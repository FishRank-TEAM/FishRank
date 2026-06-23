'use client';

import Link from 'next/link';
import { formatLength } from '@/lib/utils';
import CatchThumbnail from '@/components/ranking/CatchThumbnail';
import GradeBadge from '@/components/ranking/GradeBadge';
import RankingLocationMeta from '@/components/ranking/RankingLocationMeta';
import type { RankingTypeKey } from '@/lib/ranking.constants';

type HighlightItem = {
  rank: number;
  user: { nickname: string };
  catch: { id: string; imageUrl: string; locationName?: string; createdAt: string };
  fishSpecies?: { nameKo: string };
  lengthCm?: number | null;
  rankScore: number;
  voteCount?: number;
  grade?: string | null;
  recordType?: 'certified' | 'personal';
  previousRank?: number | null;
  rankGain?: number;
  highlightReason?: string | null;
};

type Props = {
  item: HighlightItem;
  rankingType: RankingTypeKey;
  speciesLabel: string;
};

export default function RankingHighlightCard({ item, rankingType, speciesLabel }: Props) {
  const isUnofficial = rankingType === 'unofficial';
  const hasRise = !!item.highlightReason && (item.rankGain ?? 0) >= 2;

  return (
    <aside className="ranking-highlight-card">
      <p className="ranking-highlight-label">오늘의 하이라이트</p>

      <div className="ranking-highlight-hero">
        <CatchThumbnail imageUrl={item.catch.imageUrl} size={72} />
        <span className="ranking-highlight-crown" aria-hidden>
          {hasRise ? '📈' : '👑'}
        </span>
      </div>

      <div className="ranking-highlight-body">
        {hasRise ? (
          <div className="ranking-highlight-rise">{item.highlightReason}</div>
        ) : (
          <div className="ranking-highlight-rank">
            {speciesLabel} {item.rank}위
          </div>
        )}
        <Link href={`/profile/${item.user.nickname}`} className="ranking-highlight-name">
          {item.user.nickname}
        </Link>
        <RankingLocationMeta
          locationName={item.catch.locationName}
          createdAt={item.catch.createdAt}
          className="ranking-highlight-meta"
        />
      </div>

      <div className="ranking-highlight-stats">
        {isUnofficial ? (
          <>
            <div className="ranking-highlight-stat-main">👍 {item.voteCount ?? item.rankScore}</div>
            <div className="ranking-highlight-stat-sub">
              {hasRise ? `+${item.rankGain}단계 상승` : '추천'}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <GradeBadge grade={item.grade} />
              <div className="ranking-highlight-stat-main">{formatLength(item.lengthCm)}</div>
            </div>
            {hasRise && (
              <div className="ranking-highlight-stat-sub">+{item.rankGain}단계 상승</div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
