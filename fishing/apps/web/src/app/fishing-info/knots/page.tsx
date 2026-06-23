'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import PageBackLink from '@/components/layout/PageBackLink';
import {
  KNOTS,
  KNOT_CATEGORIES,
  KNOT_CATEGORY_LABEL,
  KNOT_DIFFICULTY_LABEL,
  getDifficultyBadgeClass,
  type KnotCategory,
} from '@/data/knots';

export default function KnotsPage() {
  const [category, setCategory] = useState<KnotCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return KNOTS.filter((knot) => {
      const matchCategory = category === 'all' || knot.category === category;
      const matchSearch =
        !q ||
        knot.nameKo.toLowerCase().includes(q) ||
        knot.nameEn.toLowerCase().includes(q) ||
        knot.summary.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [category, search]);

  return (
    <main>
      <PageHeader
        title="낚시 매듭"
        description="용도별 매듭 가이드 — 터미널 · 결속 · 고리 · 릴"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="매듭 이름 검색"
          className="site-search-input"
        />
      </PageHeader>

      <div className="site-container site-page-body page-narrow">
        <PageBackLink href="/fishing-info" label="낚시 정보로" />

        <div className="knots-intro">
          <h2 className="knots-intro-title">낚시 매듭을 묶는 방법</h2>
          <p className="knots-intro-desc">
            FishRank가 직접 정리한 낚시 매듭 가이드입니다. 카드를 눌러 단계별 설명을 확인하세요.
          </p>
        </div>

        <div className="site-chips" style={{ marginBottom: 20 }}>
          {KNOT_CATEGORIES.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategory(tab.key)}
              className={`site-chip${category === tab.key ? ' active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="knot-grid">
          {filtered.map((knot) => (
            <Link
              key={knot.slug}
              href={`/fishing-info/knots/${knot.slug}`}
              className="knot-grid-link"
            >
              <article className="knot-grid-card">
                <div className="knot-grid-thumb">{knot.icon}</div>
                <div className="knot-grid-body">
                  <div className="knot-grid-head">
                    <div>
                      <h3 className="knot-grid-name">{knot.nameKo}</h3>
                      <p className="knot-grid-en">{knot.nameEn}</p>
                    </div>
                    <span className={`site-badge ${getDifficultyBadgeClass(knot.difficulty)}`}>
                      {KNOT_DIFFICULTY_LABEL[knot.difficulty]}
                    </span>
                  </div>
                  <p className="knot-grid-summary">{knot.summary}</p>
                  <div className="knot-grid-meta">
                    <span className="site-badge site-badge-muted">{KNOT_CATEGORY_LABEL[knot.category]}</span>
                    {knot.strength && <span className="knot-grid-strength">{knot.strength}</span>}
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="site-empty">
            <div className="site-empty-icon">🪢</div>
            <p>검색 결과가 없습니다.</p>
          </div>
        )}

        <div className="knots-disclaimer">
          매듭 실패는 장비 손상·부상으로 이어질 수 있습니다. 중요한 상황에서는 숙련자와 함께
          연습하거나 여러 번 확인한 뒤 사용하세요.
        </div>
      </div>
    </main>
  );
}
