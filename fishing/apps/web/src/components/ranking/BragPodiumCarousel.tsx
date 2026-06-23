'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getImageUrl } from '@/lib/images';
import type { RankingItem } from '@/components/RankingCard';

const RANK_LABELS = ['1위', '2위', '3위'];
const INTERVAL_MS = 4000;

type Props = {
  items: RankingItem[];
};

export default function BragPodiumCarousel({ items }: Props) {
  const podium = items.slice(0, 3);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (podium.length <= 1) return;
    const timer = window.setInterval(() => {
      setActive((v) => (v + 1) % podium.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [podium.length]);

  if (!podium.length) return null;

  const current = podium[active];
  const src = getImageUrl(current.catch.imageUrl);

  return (
    <section className="brag-podium">
      <div className="brag-podium-head">
        <h3 className="brag-podium-title">TOP 3</h3>
        <div className="brag-podium-dots">
          {podium.map((item, i) => (
            <button
              key={item.catch.id}
              type="button"
              className={`brag-podium-dot${i === active ? ' active' : ''}`}
              aria-label={`${RANK_LABELS[i]} 보기`}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      </div>

      <div className="brag-podium-stage">
        {src ? (
          <img
            key={current.catch.id}
            src={src}
            alt=""
            className="brag-podium-photo"
          />
        ) : (
          <div className="brag-podium-photo brag-podium-photo--empty">🐟</div>
        )}
        <span className="brag-podium-rank">{RANK_LABELS[active]}</span>
      </div>

      <div className="brag-podium-info">
        <Link href={`/profile/${current.user.nickname}`} className="brag-podium-name">
          {current.user.nickname}
        </Link>
        <span className="brag-podium-votes">👍 {current.voteCount ?? current.rankScore}</span>
      </div>
    </section>
  );
}
