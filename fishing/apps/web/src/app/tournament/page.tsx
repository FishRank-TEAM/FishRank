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

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  upcoming: { label: '예정', color: '#1565c0', bg: '#e3f2fd' },
  active:   { label: '진행중', color: '#2e7d32', bg: '#e8f5e9' },
  closed:   { label: '마감', color: '#546e7a', bg: '#f0f4f8' },
  finished: { label: '종료', color: '#90a4ae', bg: '#f5f7fa' },
};

const CAT_TABS = [
  { key: 'all', label: '전체' },
  { key: 'freshwater', label: '🏞 민물낚시' },
  { key: 'saltwater', label: '🌊 바다낚시' },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

export default function TournamentPage() {
  const [category, setCategory] = useState('all');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tournaments', category],
    queryFn: async () => {
      const res = await api.get(`/tournaments?category=${category}`);
      return res.data.data;
    },
  });

  return (
    <main>
      <PageHeader
        title="낚시 대회"
        description="줄자 인증 기반 공정한 대회"
      />

      <div className="site-container site-page-body" style={{ maxWidth: 900 }}>
        <div className="site-chips" style={{ marginBottom: 24 }}>
          {CAT_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategory(tab.key)}
              className={`site-chip${category === tab.key ? ' active' : ''}`}
            >
              {tab.label.replace(/🏞 |🌊 /g, '')}
            </button>
          ))}
        </div>

        {isLoading ? (
          <SiteLoadingState icon="🏆" message="대회 불러오는 중..." />
        ) : isError ? (
          <SiteErrorState
            icon="⚠️"
            title="대회 목록을 불러오지 못했습니다"
            onRetry={() => refetch()}
          />
        ) : !data?.length ? (
          <SiteEmptyState
            icon="🏆"
            title="진행 중인 대회가 없습니다"
            description="새 대회가 열리면 이곳에서 확인하고 참가할 수 있습니다."
            actionHref="/ranking"
            actionLabel="랭킹 보러 가기"
          />
        ) : (
          <div className="tournament-grid">
            {data.map((t: {
              id: string;
              status: string;
              category: string;
              bannerUrl?: string;
              title: string;
              prizeAmount: number;
              description: string;
              startAt: string;
              endAt: string;
              isFree: boolean;
              entryFee: number;
              _count?: { entries: number };
            }) => {
              const statusInfo = STATUS_MAP[t.status] ?? STATUS_MAP.closed;
              return (
                <Link key={t.id} href={`/tournament/${t.id}`} style={{ textDecoration: 'none' }}>
                  <div className={`tournament-card${t.status === 'active' ? ' active' : ''}`}>
                    <div
                      className={`tournament-card-banner ${t.category === 'saltwater' ? 'saltwater' : 'freshwater'}`}
                      style={t.bannerUrl ? {
                        background: `url(${getImageUrl(t.bannerUrl)}) center/cover no-repeat`,
                        minHeight: 120,
                      } : undefined}
                    >
                      {t.bannerUrl && <div className="tournament-card-banner-overlay" />}
                      <div className="tournament-card-banner-content">
                        <div className="tournament-card-meta">
                          <span className="tournament-card-cat">
                            {t.category === 'saltwater' ? '바다낚시' : '민물낚시'}
                          </span>
                          <span style={{ background: statusInfo.bg, color: statusInfo.color, fontSize: '11px', fontWeight: 700, borderRadius: '3px', padding: '3px 8px' }}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="tournament-card-title">{t.title}</div>
                        {t.prizeAmount > 0 && (
                          <div className="tournament-card-prize">
                            상금 {t.prizeAmount.toLocaleString()}원
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="tournament-card-body">
                      <p className="tournament-card-desc">
                        {t.description.length > 60 ? t.description.substring(0, 60) + '...' : t.description}
                      </p>
                      <div className="tournament-card-info">
                        <span>📅 {formatDate(t.startAt)} ~ {formatDate(t.endAt)}</span>
                        <span>👥 {t._count?.entries ?? 0}명 참가</span>
                        <span>{t.isFree ? '무료' : `참가비 ${t.entryFee.toLocaleString()}원`}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
