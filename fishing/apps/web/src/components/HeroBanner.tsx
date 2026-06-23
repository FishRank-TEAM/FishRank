'use client';

import { useEffect, useState } from 'react';
import WaveDivider from '@/components/layout/WaveDivider';

const HERO_IMAGES = ['/1.jpg', '/2.jpg', '/3.jpg'];

export default function HeroBanner({ children }: { children: React.ReactNode }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="hero-banner">
      <div className="hero-banner-collage" aria-hidden>
        {HERO_IMAGES.map((src) => (
          <div
            key={`col-${src}`}
            className="hero-banner-collage-item"
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
      </div>

      {HERO_IMAGES.map((src, i) => (
        <div
          key={`slide-${src}`}
          className="hero-banner-slide"
          style={{
            backgroundImage: `url(${src})`,
            opacity: activeIndex === i ? 1 : 0,
          }}
          aria-hidden
        />
      ))}

      <div className="hero-banner-overlay" aria-hidden />

      <div className="hero-banner-content">{children}</div>

      <div className="hero-banner-dots" aria-hidden>
        {HERO_IMAGES.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`hero-banner-dot${activeIndex === i ? ' active' : ''}`}
            onClick={() => setActiveIndex(i)}
            aria-label={`슬라이드 ${i + 1}`}
          />
        ))}
      </div>

      <WaveDivider layered />
    </section>
  );
}
