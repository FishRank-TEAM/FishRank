'use client';

import { useEffect, useState } from 'react';

const RANK_CYCLE = ['1위', '5위', '12위', '47위', '몇 위'];

export default function HeroBannerText() {
  const [rankIndex, setRankIndex] = useState(0);
  const [rankVisible, setRankVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setRankVisible(false);
      setTimeout(() => {
        setRankIndex((prev) => (prev + 1) % RANK_CYCLE.length);
        setRankVisible(true);
      }, 280);
    }, 2600);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <div className="hero-badge hero-animate hero-animate-1">
        <span className="hero-badge-dot" />
        이번 주 랭킹 집계 중
      </div>

      <h1 className="hero-title">
        <span className="hero-animate hero-animate-2">오늘 잡은 물고기,</span>
        <span className="hero-animate hero-animate-3 hero-title-line">
          전국{' '}
          <span className={`hero-rank-cycle${rankVisible ? ' visible' : ''}`}>
            {RANK_CYCLE[rankIndex]}
          </span>
          인지 확인하세요
        </span>
      </h1>

      <p className="hero-subtitle hero-animate hero-animate-4">
        <span className="hero-kw">줄자 인증</span>으로 기록을 남기고,{' '}
        <span className="hero-kw">어종별 랭킹</span>과{' '}
        <span className="hero-kw">대회</span>에서 실력을 겨루세요.
        <br />
        인증샷만 올리던 낚시, 이제 <span className="hero-kw hero-kw-accent">순위</span>로 증명합니다.
      </p>
    </>
  );
}
