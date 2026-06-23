'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatLength } from '@/lib/utils';
import type { RankingItem } from '@/components/RankingCard';
import type { RankingTypeKey } from '@/lib/ranking.constants';
import CatchThumbnail from '@/components/ranking/CatchThumbnail';
import BragDetailModal from '@/components/ranking/BragDetailModal';

const PODIUM_ORDER = [2, 1, 3] as const;

const SLOT_CLASS: Record<1 | 2 | 3, string> = {
  1: 'ranking-podium-slot--gold',
  2: 'ranking-podium-slot--silver',
  3: 'ranking-podium-slot--bronze',
};

type Props = {
  items: RankingItem[];
  rankingType: RankingTypeKey;
};

function TrophyIcon({ rank, tone }: { rank: number; tone: 'gold' | 'silver' | 'bronze' }) {
  const fill = tone === 'gold' ? '#f0c419' : tone === 'silver' ? '#d0d0d0' : '#e08a3c';
  const dark = tone === 'gold' ? '#c9a012' : tone === 'silver' ? '#9a9a9a' : '#b56a28';
  const base = tone === 'gold' ? '#8b6914' : tone === 'silver' ? '#6e6e6e' : '#7a4a1a';

  return (
    <svg
      className={`ranking-podium-trophy ranking-podium-trophy--${tone}`}
      viewBox="0 0 48 56"
      width="28"
      height="33"
      aria-hidden
    >
      <ellipse cx="24" cy="52" rx="13" ry="3" fill={base} />
      <rect x="20" y="46" width="8" height="6" rx="1.5" fill={base} />
      <path
        d="M13 18c0-6 5-11 11-11s11 5 11 11v5c0 4-2.5 7-6 8.5l-1.2 10H20.2L19 31.5c-3.5-1.5-6-4.5-6-8.5v-5z"
        fill={fill}
      />
      <path
        d="M11 21c-3.5 1.2-6 4.5-6 8 0 3.5 2.5 6 6 6M37 21c3.5 1.2 6 4.5 6 8 0 3.5-2.5 6-6 6"
        fill="none"
        stroke={fill}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <text
        x="24"
        y="27"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize="14"
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
      >
        {rank}
      </text>
      <ellipse cx="24" cy="18" rx="10" ry="3" fill={dark} opacity="0.2" />
    </svg>
  );
}

export default function RankingPodium({ items, rankingType }: Props) {
  const [detailItem, setDetailItem] = useState<RankingItem | null>(null);
  const isUnofficial = rankingType === 'unofficial';
  const byRank = new Map(items.filter((i) => i.rank <= 3).map((i) => [i.rank, i]));
  const slots = PODIUM_ORDER.filter((rank) => byRank.has(rank)).map((rank) => ({
    rank,
    item: byRank.get(rank)!,
  }));

  if (!slots.length) return null;

  return (
    <section className="ranking-podium" aria-label="TOP 3 명예의 전당">
      <p className="ranking-podium-heading">명예의 전당</p>
      <div className="ranking-podium-stage">
        {slots.map(({ rank, item }) => {
          const tone = rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze';
          const isUnofficialItem = item.verified === false || item.recordType === 'personal';
          const thumbSize = rank === 1 ? 40 : 34;

          return (
            <article
              key={item.catch.id}
              className={`ranking-podium-slot ${SLOT_CLASS[rank as 1 | 2 | 3]}${isUnofficialItem ? ' ranking-podium-slot--clickable' : ''}`}
              onClick={() => {
                if (isUnofficialItem) setDetailItem(item);
              }}
            >
              <div className="ranking-podium-card">
                {rank === 1 && (
                  <div className="ranking-podium-stars" aria-hidden>
                    <span>★</span>
                    <span className="ranking-podium-stars-main">★</span>
                    <span>★</span>
                  </div>
                )}

                <TrophyIcon rank={rank} tone={tone} />

                <CatchThumbnail imageUrl={item.catch.imageUrl} size={thumbSize} />

                <Link
                  href={`/profile/${item.user.nickname}`}
                  className="ranking-podium-name"
                  onClick={(event) => event.stopPropagation()}
                >
                  {item.user.nickname}
                </Link>

                <div className="ranking-podium-stat">
                  {isUnofficial || isUnofficialItem ? (
                    <>
                      <button
                        type="button"
                        className="ranking-podium-brag-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDetailItem(item);
                        }}
                      >
                        자랑 보기
                      </button>
                      <span>👍 {item.voteCount ?? Number(item.rankScore)}</span>
                    </>
                  ) : (
                    <>
                      <span className="ranking-podium-stat-main">{formatLength(item.lengthCm)}</span>
                      {item.grade && <span className="ranking-podium-grade">{item.grade}</span>}
                    </>
                  )}
                </div>
              </div>

              <div className={`ranking-podium-block ranking-podium-block--${tone}`} aria-hidden>
                {rank}
              </div>
            </article>
          );
        })}
      </div>

      {detailItem && (
        <BragDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
      )}
    </section>
  );
}
