'use client';

import { useEffect, useMemo, useState } from 'react';

type SpeciesSpotlight = {
  topRankSpecies: string | null;
  popularSpecies: string | null;
  popularCatchCount: number;
};

type Slide = {
  value: string;
  label: string;
};

const EMPTY_SPOTLIGHT: SpeciesSpotlight = {
  topRankSpecies: null,
  popularSpecies: null,
  popularCatchCount: 0,
};

export default function HomeSpeciesRotate({
  spotlight = EMPTY_SPOTLIGHT,
}: {
  spotlight?: SpeciesSpotlight;
}) {
  const data = spotlight ?? EMPTY_SPOTLIGHT;

  const slides = useMemo<Slide[]>(() => {
    const items: Slide[] = [];
    if (data.popularSpecies) {
      const countLabel =
        data.popularCatchCount > 0 ? ` · ${data.popularCatchCount}건` : '';
      items.push({
        value: data.popularSpecies,
        label: `인기 어종${countLabel}`,
      });
    }
    if (data.topRankSpecies) {
      items.push({
        value: data.topRankSpecies,
        label: '1위 어종',
      });
    }
    return items;
  }, [data.popularSpecies, data.popularCatchCount, data.topRankSpecies]);

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % slides.length);
        setVisible(true);
      }, 280);
    }, 3200);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) {
    return (
      <div className="home-stat">
        <span className="home-stat-value home-stat-value-text">–</span>
        <span className="home-stat-label">어종</span>
      </div>
    );
  }

  const current = slides[index] ?? slides[0];

  return (
    <div className="home-stat">
      <span
        className={`home-stat-value home-stat-value-text home-stat-rotate${visible ? ' visible' : ''}`}
      >
        {current.value}
      </span>
      <span className="home-stat-label">{current.label}</span>
    </div>
  );
}
