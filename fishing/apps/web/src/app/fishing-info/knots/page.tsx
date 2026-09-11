'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import PageBackLink from '@/components/layout/PageBackLink';
import SiteEmptyState from '@/components/layout/SiteEmptyState';
import {
  KNOT_CATEGORIES,
  KNOT_CATEGORY_LABEL,
  KNOT_DIFFICULTY_LABEL,
  KNOT_SORT_OPTIONS,
  KNOTS,
  KNOTS_DISCLAIMER,
  filterKnots,
  getDifficultyBadgeClass,
  sortKnots,
  type KnotCategory,
  type KnotSort,
} from '@/data/knots';

export default function KnotsPage() {
  const [category, setCategory] = useState<KnotCategory | 'all'>('all');
  const [sort, setSort] = useState<KnotSort>('difficulty-asc');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return sortKnots(filterKnots(KNOTS, { category, query: search }), sort);
  }, [category, search, sort]);

  return (
    <main>
      <PageHeader
        title="낚시 매듭"
        description="용도별 매듭 가이드 — 터미널 · 결속 · 고리 · 릴"
      >
        <div className="knots-toolbar">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="매듭 이름·용도 검색"
            className="site-search-input"
            aria-label="매듭 검색"
          />
          {search && (
            <button
              type="button"
              className="site-btn-sm"
              onClick={() => setSearch('')}
              aria-label="검색어 지우기"
            >
              지우기
            </button>
          )}
          <label className="knots-sort">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as KnotSort)}
              aria-label="매듭 정렬"
            >
              {KNOT_SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </PageHeader>

      <div className="site-container site-page-body page-narrow">
        <PageBackLink href="/fishing-info" label="낚시 정보로" />

        <div className="knots-intro">
          <h2 className="knots-intro-title">낚시 매듭을 묶는 방법</h2>
          <p className="knots-intro-desc">
            FishRank가 직접 정리한 낚시 매듭 가이드입니다. 카드를 눌러 단계별 설명을 확인하세요.
          </p>
        </div>

        <div className="site-chips" style={{ marginBottom: 12 }} role="tablist" aria-label="매듭 카테고리">
          {KNOT_CATEGORIES.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={category === tab.key}
              aria-pressed={category === tab.key}
              onClick={() => setCategory(tab.key)}
              className={`site-chip${category === tab.key ? ' active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <p className="knots-count" aria-live="polite">
          {filtered.length}개 매듭
        </p>

        {filtered.length === 0 ? (
          <SiteEmptyState
            icon="🪢"
            title="검색 결과가 없습니다"
            description="다른 검색어나 카테고리를 선택해 보세요."
          />
        ) : (
          <div className="knot-grid">
            {filtered.map((knot) => (
              <Link
                key={knot.slug}
                href={`/fishing-info/knots/${knot.slug}`}
                className="knot-grid-link"
              >
                <article className="knot-grid-card">
                  <div className="knot-grid-thumb" aria-hidden>
                    {knot.icon}
                  </div>
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
                      <span className="site-badge site-badge-muted">
                        {KNOT_CATEGORY_LABEL[knot.category]}
                      </span>
                      {knot.strength && (
                        <span className="knot-grid-strength">{knot.strength}</span>
                      )}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        <div className="knots-disclaimer">{KNOTS_DISCLAIMER}</div>
      </div>
    </main>
  );
}
