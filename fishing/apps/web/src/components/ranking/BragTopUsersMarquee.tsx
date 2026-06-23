'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { getImageUrl } from '@/lib/images';
import type { RankingItem } from '@/components/RankingCard';

const MAX_ITEMS = 10;

type Props = {
  items: RankingItem[];
};

function MarqueeItem({ item }: { item: RankingItem }) {
  const src = getImageUrl(item.catch.imageUrl);

  return (
    <Link
      href={`/profile/${encodeURIComponent(item.user.nickname)}`}
      className="brag-top-marquee-item"
      title={`${item.rank}위 ${item.user.nickname}`}
    >
      <div className="brag-top-marquee-photo">
        {src ? (
          <img src={src} alt={`${item.user.nickname} 자랑 기록`} loading="lazy" />
        ) : (
          <span className="brag-top-marquee-placeholder" aria-hidden>🐟</span>
        )}
        <span className="brag-top-marquee-rank">{item.rank}</span>
      </div>
      <span className="brag-top-marquee-name">{item.user.nickname}</span>
      {(item.voteCount ?? item.rankScore) > 0 && (
        <span className="brag-top-marquee-votes">👍 {item.voteCount ?? item.rankScore}</span>
      )}
    </Link>
  );
}

export default function BragTopUsersMarquee({ items }: Props) {
  const top = items.slice(0, MAX_ITEMS);
  if (top.length === 0) return null;

  const loop = top.length > 1 ? [...top, ...top] : top;

  return (
    <section className="brag-top-marquee" aria-label="자랑 랭킹 상위권">
      <div className="brag-top-marquee-head">
        <h3 className="brag-top-marquee-title">상위권 자랑</h3>
        <span className="brag-top-marquee-hint">TOP {top.length}</span>
      </div>
      <div className="brag-top-marquee-viewport">
        <div
          className={`brag-top-marquee-track${top.length > 1 ? ' brag-top-marquee-track--animate' : ''}`}
          style={top.length > 1 ? { '--marquee-count': top.length } as CSSProperties : undefined}
        >
          {loop.map((item, i) => (
            <MarqueeItem key={`${item.catch.id}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
