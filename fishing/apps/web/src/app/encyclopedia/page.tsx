'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/images';
import PageHeader from '@/components/layout/PageHeader';
import SiteEmptyState from '@/components/layout/SiteEmptyState';
import SiteErrorState from '@/components/layout/SiteErrorState';
import SiteLoadingState from '@/components/layout/SiteLoadingState';
import {
  ENCYCLOPEDIA_SORT_OPTIONS,
  ENCYCLOPEDIA_TECHNIQUE_OPTIONS,
  type EncyclopediaSort,
  type EncyclopediaTechnique,
} from '@/lib/encyclopedia-filters';

const CAT_TABS = [
  { key: 'all', label: '전체' },
  { key: 'freshwater', label: '민물' },
  { key: 'saltwater', label: '바다' },
];

const PAGE_SIZE = 24;

type EncyclopediaListItem = {
  id: number;
  fishSpeciesId: number;
  nameKo: string;
  nameEn: string | null;
  category: string;
  imageUrl: string | null;
  season: string | null;
  bait: string | null;
  technique: string | null;
  minSizeLaw: number | null;
  hint: string | null;
};

type EncyclopediaListResponse = {
  items: EncyclopediaListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type EncyclopediaStats = {
  total: number;
  freshwater: number;
  saltwater: number;
};

function FishCardImage({ nameKo, category, imageUrl }: { nameKo: string; category: string; imageUrl: string | null }) {
  const src = getImageUrl(imageUrl);
  if (src) {
    return (
      <div className="encyclopedia-card-photo">
        <img src={src} alt={nameKo} loading="lazy" />
      </div>
    );
  }

  return (
    <div className={`encyclopedia-card-photo encyclopedia-card-photo--placeholder ${category}`}>
      <span>{category === 'saltwater' ? '🐠' : '🐟'}</span>
    </div>
  );
}

export default function EncyclopediaPage() {
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<EncyclopediaSort>('name');
  const [technique, setTechnique] = useState<EncyclopediaTechnique>('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery({
    queryKey: ['encyclopedia-stats'],
    queryFn: async () => {
      const res = await api.get('/encyclopedia/stats');
      return res.data.data as EncyclopediaStats;
    },
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['encyclopedia', category, query, page, sort, technique],
    queryFn: async () => {
      const params = new URLSearchParams({
        category,
        page: String(page),
        limit: String(PAGE_SIZE),
        sort,
        technique,
      });
      if (query) params.set('search', query);
      const res = await api.get(`/encyclopedia?${params.toString()}`);
      return res.data.data as EncyclopediaListResponse;
    },
  });

  const handleSearch = () => {
    setPage(1);
    setQuery(search.trim());
  };

  return (
    <main>
      <PageHeader
        title="어종 사전"
        description="사진·시즌·미끼 — 필요한 정보만"
      />

      <div className="site-container site-page-body" style={{ maxWidth: 1100 }}>
        {stats && (
          <p className="post-meta-muted encyclopedia-list-stats">
            전체 {stats.total.toLocaleString()}종 · 민물 {stats.freshwater.toLocaleString()} · 바다{' '}
            {stats.saltwater.toLocaleString()}
          </p>
        )}

        <div className="encyclopedia-filter-row">
          <div className="encyclopedia-filter-left">
            <div className="site-chips">
              {CAT_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setCategory(tab.key);
                    setPage(1);
                  }}
                  className={`site-chip${category === tab.key ? ' active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="encyclopedia-filter-dropdowns">
              <label className="encyclopedia-filter-select-wrap">
                <span className="encyclopedia-filter-select-label">정렬</span>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as EncyclopediaSort);
                    setPage(1);
                  }}
                  className="encyclopedia-filter-select"
                  aria-label="정렬"
                >
                  {ENCYCLOPEDIA_SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>

              <label className="encyclopedia-filter-select-wrap">
                <span className="encyclopedia-filter-select-label">기법</span>
                <select
                  value={technique}
                  onChange={(e) => {
                    setTechnique(e.target.value as EncyclopediaTechnique);
                    setPage(1);
                  }}
                  className="encyclopedia-filter-select"
                  aria-label="낚시 기법"
                >
                  {ENCYCLOPEDIA_TECHNIQUE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <form
            className="encyclopedia-search"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="어종 이름 검색"
              className="encyclopedia-search-input"
              aria-label="어종 이름 검색"
            />
            {query && (
              <button
                type="button"
                className="encyclopedia-search-clear"
                onClick={() => {
                  setSearch('');
                  setQuery('');
                  setPage(1);
                }}
                aria-label="검색어 지우기"
              >
                ✕
              </button>
            )}
            <button type="submit" className="encyclopedia-search-btn">
              검색
            </button>
          </form>
        </div>

        {isLoading ? (
          <SiteLoadingState icon="🐟" message="어종 정보 불러오는 중..." />
        ) : isError ? (
          <SiteErrorState
            icon="⚠️"
            title="어종 사전을 불러오지 못했습니다"
            onRetry={() => refetch()}
          />
        ) : !data?.items.length ? (
          <SiteEmptyState
            icon="🔍"
            title={technique !== 'all' || query ? '조건에 맞는 어종이 없습니다' : '검색 결과가 없습니다'}
            description="다른 검색어나 필터를 시도해 보세요."
            actionHref="/encyclopedia"
            actionLabel="전체 목록 보기"
          />
        ) : (
          <>
            <div className="encyclopedia-photo-grid">
              {data.items.map((item) => (
                <Link
                  key={item.fishSpeciesId}
                  href={`/encyclopedia/${item.fishSpeciesId}`}
                  className="encyclopedia-photo-card"
                >
                  <FishCardImage
                    nameKo={item.nameKo}
                    category={item.category}
                    imageUrl={item.imageUrl}
                  />
                  <div className="encyclopedia-photo-card-body">
                    <div className="encyclopedia-photo-card-top">
                      <h3 className="encyclopedia-card-name">{item.nameKo}</h3>
                      <span
                        className={`site-badge ${item.category === 'saltwater' ? 'site-badge-blue' : 'site-badge-green'}`}
                      >
                        {item.category === 'saltwater' ? '바다' : '민물'}
                      </span>
                    </div>
                    {item.hint && (
                      <p className="encyclopedia-photo-card-hint">
                        {item.hint.length > 42 ? `${item.hint.slice(0, 42)}…` : item.hint}
                      </p>
                    )}
                    {item.minSizeLaw && (
                      <span className="encyclopedia-photo-card-law">최소 {item.minSizeLaw}cm</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {data.totalPages > 1 && (
              <div className="encyclopedia-pagination">
                <button
                  type="button"
                  className="site-btn site-btn-ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  이전
                </button>
                <span className="post-meta-muted">
                  {page} / {data.totalPages}
                </span>
                <button
                  type="button"
                  className="site-btn site-btn-ghost"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
