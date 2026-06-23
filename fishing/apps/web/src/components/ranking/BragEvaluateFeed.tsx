'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/images';
import { formatTimeAgo } from '@/lib/utils';
import { getEvaluatedIds, markEvaluated } from '@/lib/brag-eval';
import { useAuthStore } from '@/store/auth.store';
import { useRankingFilters } from '@/components/ranking/RankingFilterContext';
import { ALL_RANKING_SPECIES_ID } from '@/lib/ranking.constants';
import BragDetailModal from '@/components/ranking/BragDetailModal';
import type { RankingItem } from '@/components/RankingCard';

export default function BragEvaluateFeed() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { period, speciesId } = useRankingFilters();
  const { isLoggedIn, user } = useAuthStore();
  const [evaluated, setEvaluated] = useState(() => getEvaluatedIds());
  const [busy, setBusy] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [detailItem, setDetailItem] = useState<RankingItem | null>(null);

  const { data: feed, isLoading } = useQuery({
    queryKey: ['brag-feed', period, speciesId],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        periodType: period,
        limit: 50,
      };
      if (speciesId > ALL_RANKING_SPECIES_ID) {
        params.speciesId = speciesId;
      }
      const res = await api.get('/rankings/brag-feed', { params });
      return res.data.data.feed as RankingItem[];
    },
  });

  const queue = useMemo(() => {
    if (!feed?.length) return [];
    return feed.filter(
      (item) =>
        !evaluated.has(item.catch.id) &&
        item.user.id !== user?.id,
    );
  }, [feed, evaluated, user?.id]);

  const current = queue[0];

  const advance = (catchId: string) => {
    markEvaluated(catchId);
    setEvaluated((prev) => new Set([...prev, catchId]));
    setAnimKey((k) => k + 1);
  };

  const handleLike = async () => {
    if (!current || busy) return;
    if (!isLoggedIn) {
      router.push('/auth/login');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/catches/${current.catch.id}/like`);
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
      queryClient.invalidateQueries({ queryKey: ['brag-feed'] });
    } catch {
      // pass anyway — already voted etc.
    } finally {
      advance(current.catch.id);
      setBusy(false);
    }
  };

  const handlePass = () => {
    if (!current || busy) return;
    setBusy(true);
    advance(current.catch.id);
    setBusy(false);
  };

  return (
    <section className="brag-evaluate">
      <h3 className="brag-evaluate-title">새 자랑 평가</h3>
      {isLoading ? (
        <div className="brag-evaluate-empty">불러오는 중...</div>
      ) : !current ? (
        <div className="brag-evaluate-empty">
          <span>✨</span>
          <p>평가할 새 자랑이 없어요</p>
          <Link href="/upload/personal" className="site-btn-sm site-btn-primary">
            자랑 올리기
          </Link>
        </div>
      ) : (
        <article key={`${current.catch.id}-${animKey}`} className="brag-evaluate-card brag-evaluate-card-enter">
          <button
            type="button"
            className="brag-evaluate-photo-wrap"
            onClick={() => setDetailItem(current)}
            aria-label="자랑 상세 보기"
          >
            {getImageUrl(current.catch.imageUrl) ? (
              <img
                src={getImageUrl(current.catch.imageUrl)!}
                alt=""
                className="brag-evaluate-photo"
              />
            ) : (
              <div className="brag-evaluate-photo brag-evaluate-photo--empty">🐟</div>
            )}
          </button>

          <div className="brag-evaluate-body">
            <Link href={`/profile/${current.user.nickname}`} className="brag-evaluate-name">
              {current.user.nickname}
            </Link>
            <p className="brag-evaluate-meta">
              {[current.catch.locationName, formatTimeAgo(current.catch.createdAt)]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {current.fishSpecies?.nameKo && (
              <p className="brag-evaluate-species">{current.fishSpecies.nameKo}</p>
            )}
            {current.catch.memo && (
              <button
                type="button"
                className="brag-evaluate-memo"
                onClick={() => setDetailItem(current)}
              >
                {current.catch.memo}
              </button>
            )}
          </div>

          <div className="brag-evaluate-actions">
            <button
              type="button"
              className="brag-evaluate-btn brag-evaluate-btn-pass"
              onClick={handlePass}
              disabled={busy}
            >
              <span aria-hidden>👎</span>
              싫어요
            </button>
            <button
              type="button"
              className="brag-evaluate-btn brag-evaluate-btn-like"
              onClick={handleLike}
              disabled={busy}
            >
              <span aria-hidden>👍</span>
              좋아요
            </button>
          </div>
        </article>
      )}

      {detailItem && (
        <BragDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
      )}
    </section>
  );
}
