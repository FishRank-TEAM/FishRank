'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { getImageUrl } from '@/lib/images';
import UserAvatar from '@/components/ui/UserAvatar';

const STATUS_MAP: Record<string, string> = {
  upcoming: '예정', active: '진행중', closed: '마감', finished: '종료',
};

function getRankMedal(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}위`;
}

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoggedIn } = useAuthStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tournament', id],
    queryFn: async () => {
      const res = await api.get(`/tournaments/${id}`);
      return res.data.data;
    },
  });

  const { data: myEntry } = useQuery({
    queryKey: ['my-entry', id],
    queryFn: async () => {
      const res = await api.get(`/tournaments/${id}/my-entry`);
      return res.data.data;
    },
    enabled: isLoggedIn,
  });

  const { data: rankingData } = useQuery({
    queryKey: ['tournament-ranking', id],
    queryFn: async () => {
      const res = await api.get(`/tournaments/${id}/ranking`);
      return res.data.data;
    },
  });

  const joinMutation = useMutation({
    mutationFn: () => api.post(`/tournaments/${id}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
      queryClient.invalidateQueries({ queryKey: ['my-entry', id] });
    },
  });

  if (isLoading || !data) {
    return (
      <main>
        <div className="site-container site-page-body site-empty">
          <div className="site-empty-icon">🏆</div>
          <p>불러오는 중...</p>
        </div>
      </main>
    );
  }

  const isActive = data.status === 'active';
  const isFree = data.isFree;
  const bannerClass = data.category === 'saltwater' ? 'saltwater' : 'freshwater';

  return (
    <main>
      <div
        className={`tournament-detail-banner ${bannerClass}`}
        style={data.bannerUrl ? {
          background: `url(${getImageUrl(data.bannerUrl)}) center/cover no-repeat`,
          minHeight: 200,
        } : undefined}
      >
        {data.bannerUrl && <div className="tournament-detail-banner-overlay" />}
        <div className="tournament-detail-banner-inner">
          <Link href="/tournament" className="tournament-detail-back">← 대회 목록</Link>
          <div className="tournament-detail-tags">
            <span className="tournament-card-cat">
              {data.category === 'saltwater' ? '바다낚시' : '민물낚시'}
            </span>
            <span className={`site-badge ${isActive ? 'site-badge-green' : 'site-badge-muted'}`}>
              {STATUS_MAP[data.status]}
            </span>
          </div>
          <h1 className="tournament-detail-title">{data.title}</h1>
          {data.prizeAmount > 0 && (
            <div className="tournament-detail-prize">
              총 상금 {data.prizeAmount.toLocaleString()}원
            </div>
          )}
          <div className="tournament-detail-meta">
            {new Date(data.startAt).toLocaleDateString('ko-KR')} ~{' '}
            {new Date(data.endAt).toLocaleDateString('ko-KR')} · 참가 {data._count?.entries ?? 0}명
          </div>
        </div>
      </div>

      <div className="tournament-detail-grid">
        <div>
          <div className="detail-card" style={{ marginBottom: 16 }}>
            <h3 className="detail-card-title">대회 소개</h3>
            <p className="content-prose-sm">{data.description}</p>
          </div>

          {data.rules && (
            <div className="detail-card" style={{ marginBottom: 16 }}>
              <h3 className="detail-card-title">📋 대회 규정</h3>
              <pre className="content-prose-sm">{data.rules}</pre>
            </div>
          )}

          {data.prize && (
            <div className="tournament-prize-block">
              <h3>🏆 상금 구성</h3>
              <pre className="content-prose-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>{data.prize}</pre>
            </div>
          )}

          <div className="detail-card">
            <h3 className="detail-card-title">현재 순위</h3>
            {rankingData && rankingData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rankingData.slice(0, 10).map((entry: {
                  id: string;
                  user: { nickname: string; profileImage?: string | null };
                  bestLengthCm?: number;
                }, i: number) => (
                  <div
                    key={entry.id}
                    className={`tournament-rank-row${i < 3 ? ' top3' : ''}${i === 0 ? ' rank1' : ''}`}
                  >
                    <span className="tournament-rank-medal">{getRankMedal(i + 1)}</span>
                    <UserAvatar
                      nickname={entry.user.nickname}
                      profileImage={entry.user.profileImage}
                      className="tournament-rank-avatar"
                    />
                    <Link href={`/profile/${encodeURIComponent(entry.user.nickname)}`} className="tournament-rank-name">
                      {entry.user.nickname}
                    </Link>
                    <span className="tournament-rank-score">
                      {entry.bestLengthCm ? `${Number(entry.bestLengthCm).toFixed(1)}cm` : '-'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="site-empty" style={{ padding: '24px 0' }}>
                <p>아직 기록이 없습니다</p>
              </div>
            )}
          </div>
        </div>

        <aside className="tournament-join-panel">
          <div className="detail-card">
            <div className="tournament-join-fee-row">
              <span>참가비</span>
              <span className={`tournament-join-fee${isFree ? ' free' : ''}`}>
                {isFree ? '무료' : `${data.entryFee.toLocaleString()}원`}
              </span>
            </div>
            {!isFree && (
              <div className="tournament-escrow-note">🔒 에스크로 결제로 안전하게 보호됩니다</div>
            )}

            {myEntry ? (
              <div className="tournament-joined-box">
                <div className="icon">✅</div>
                <div className="label">참가 완료</div>
                <div className="post-meta-muted" style={{ marginTop: 4 }}>
                  {new Date(myEntry.joinedAt).toLocaleDateString('ko-KR')} 참가
                </div>
              </div>
            ) : isLoggedIn ? (
              <button
                type="button"
                onClick={() => joinMutation.mutate()}
                disabled={!isActive || joinMutation.isPending}
                className="site-btn-primary"
              >
                {joinMutation.isPending
                  ? '처리 중...'
                  : isActive
                    ? isFree
                      ? '무료 참가하기'
                      : `${data.entryFee.toLocaleString()}원 결제 후 참가`
                    : '참가 불가'}
              </button>
            ) : (
              <Link href="/auth/login" className="site-btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                로그인 후 참가하기
              </Link>
            )}

            <p className="tournament-join-note">
              * 유료 대회는 에스크로 결제 시스템을 통해 처리됩니다
              <br />
              * 결제 완료 후 취소/환불 불가
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
