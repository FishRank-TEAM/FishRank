'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { formatTimeAgo } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => (await api.get('/admin/stats')).data.data,
  });

  if (isLoading) {
    return <div className="admin-page"><p className="admin-muted">불러오는 중...</p></div>;
  }

  const cards = [
    { label: '신고 검토', value: data?.flaggedReports ?? 0, href: '/admin/reports', accent: '#c62828' },
    { label: '미처리 피드백', value: data?.openFeedbacks ?? 0, href: '/admin/feedbacks', accent: '#00838f' },
    { label: '진행 대회', value: data?.activeTournaments ?? 0, href: '/admin/tournaments', accent: '#0A2540' },
    { label: '전체 기록', value: data?.totalCatches ?? 0, href: '/admin/catches', accent: '#2e7d32' },
    { label: '게시글', value: data?.totalPosts ?? 0, href: '/admin/posts', accent: '#5c6bc0' },
    { label: '공지·이벤트', value: data?.publishedAnnouncements ?? 0, href: '/admin/announcements', accent: '#6a1b9a' },
    { label: '회원', value: data?.totalUsers ?? 0, href: '#', accent: '#546e7a' },
  ];

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1>관리자 대시보드</h1>
        <p>대회 운영, 기록 검수, 공지·이벤트를 한곳에서 관리합니다.</p>
      </header>

      <div className="admin-stat-grid">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="admin-stat-card">
            <span className="admin-stat-value" style={{ color: card.accent }}>{card.value.toLocaleString()}</span>
            <span className="admin-stat-label">{card.label}</span>
          </Link>
        ))}
      </div>

      <div className="admin-two-col">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h2>신고 접수 (3건 이상)</h2>
            <Link href="/admin/reports" className="admin-link">전체 보기</Link>
          </div>
          {!data?.recentFlagged?.length ? (
            <p className="admin-muted">검토가 필요한 신고가 없습니다.</p>
          ) : (
            <ul className="admin-list">
              {data.recentFlagged.map((item: any) => (
                <li key={`${item.targetType}-${item.targetId}`} className="admin-list-item">
                  <div>
                    <strong>
                      {item.targetType === 'catch'
                        ? item.target?.user?.nickname ?? '기록'
                        : item.target?.title ?? '게시글'}
                    </strong>
                    <span className="admin-muted"> · 신고 {item.reportCount}건</span>
                  </div>
                  <span className="admin-badge admin-badge-danger">{item.targetType}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel-head">
            <h2>최근 게시글</h2>
            <Link href="/admin/posts" className="admin-link">전체 보기</Link>
          </div>
          {!data?.recentPosts?.length ? (
            <p className="admin-muted">게시글이 없습니다.</p>
          ) : (
            <ul className="admin-list">
              {data.recentPosts.map((p: any) => (
                <li key={p.id} className="admin-list-item">
                  <div>
                    <strong>{p.title}</strong>
                    <span className="admin-muted"> · {p.user?.nickname}</span>
                  </div>
                  <span className="admin-muted">{formatTimeAgo(p.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <h2>최근 피드백</h2>
          <Link href="/admin/feedbacks" className="admin-link">전체 보기</Link>
        </div>
        {!data?.recentFeedbacks?.length ? (
          <p className="admin-muted">미처리 피드백이 없습니다.</p>
        ) : (
          <ul className="admin-list">
            {data.recentFeedbacks.map((item: any) => (
              <li key={item.id} className="admin-list-item">
                <div>
                  <strong>{item.user?.nickname}</strong>
                  <span className="admin-muted"> · {item.content.slice(0, 60)}{item.content.length > 60 ? '…' : ''}</span>
                </div>
                <span className="admin-muted">{formatTimeAgo(item.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
