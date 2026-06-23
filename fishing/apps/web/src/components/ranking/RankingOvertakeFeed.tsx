'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { formatTimeAgo, formatLength } from '@/lib/utils';
import { useRankingFilters } from '@/components/ranking/RankingFilterContext';
import RankBadge from '@/components/ranking/RankBadge';
import RankingEmptyState from '@/components/ranking/RankingEmptyState';

type OvertakeItem = {
  overtaker: { id: string; nickname: string; profileImage: string | null };
  overtaken: { id: string; nickname: string; profileImage: string | null };
  newRank: number;
  overtakenPreviousRank: number;
  fishSpecies: { id: number; nameKo: string } | null;
  lengthCm: number;
  grade: string | null;
  occurredAt: string;
};

type Props = {
  embedded?: boolean;
  layout?: 'sidebar' | 'row';
  limit?: number;
};

export default function RankingOvertakeFeed({
  embedded = false,
  layout = 'sidebar',
  limit = 8,
}: Props) {
  const { period, speciesId } = useRankingFilters();

  const { data, isLoading } = useQuery({
    queryKey: ['rankings-overtakes', period, speciesId, limit],
    queryFn: async () => {
      const params: Record<string, string | number> = { periodType: period, topN: 10, limit, speciesId };
      const res = await api.get('/rankings/overtakes', { params });
      return res.data.data.overtakes as OvertakeItem[];
    },
  });

  const content = (
    <>
      <div className={`ranking-overtake-header${embedded ? ' ranking-overtake-header-embedded' : ''}`}>
        <h3 className="ranking-overtake-title">상위권 추월</h3>
      </div>

      {isLoading ? (
        <div className="ranking-overtake-empty">불러오는 중...</div>
      ) : !data?.length ? (
        <RankingEmptyState
          compact
          icon="⚡"
          title="최근 추월 기록이 없어요"
          description="TOP 10 안에서 순위가 바뀌면 여기에 표시됩니다"
          ctaHref="/upload"
          ctaLabel="인증 기록 올리기"
        />
      ) : (
        <ul className={`ranking-overtake-list${layout === 'row' ? ' ranking-overtake-list-row' : ''}`}>
          {data.map((item, i) => (
            <li key={`${item.overtaker.id}-${item.occurredAt}-${i}`} className="ranking-overtake-item">
              <RankBadge rank={item.newRank} />
              <div className="ranking-overtake-body">
                <p className="ranking-overtake-line">
                  <Link href={`/profile/${encodeURIComponent(item.overtaker.nickname)}`} className="ranking-overtake-name">
                    {item.overtaker.nickname}
                  </Link>
                  <span className="ranking-overtake-arrow">→</span>
                  <Link href={`/profile/${encodeURIComponent(item.overtaken.nickname)}`} className="ranking-overtake-name overtaken">
                    {item.overtaken.nickname}
                  </Link>
                </p>
                <p className="ranking-overtake-meta">
                  {item.fishSpecies?.nameKo && <span>{item.fishSpecies.nameKo} · </span>}
                  <strong>{formatLength(item.lengthCm)}</strong>
                  {item.grade && <span> · {item.grade}</span>}
                </p>
                <time className="ranking-overtake-time">{formatTimeAgo(item.occurredAt)}</time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  if (embedded) {
    return <section className={`ranking-overtake-embedded${layout === 'row' ? ' ranking-overtake-embedded-row' : ''}`}>{content}</section>;
  }

  return (
    <aside className={`ranking-overtake-feed${layout === 'row' ? ' ranking-overtake-feed-row' : ''}`}>
      {content}
    </aside>
  );
}
