'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/images';
import { formatLength, formatTimeAgo } from '@/lib/utils';

const STATUS_TABS = [
  { key: 'pending', label: '검수 대기' },
  { key: 'approved', label: '승인됨' },
  { key: 'rejected', label: '반려됨' },
  { key: 'all', label: '전체' },
];

const STATUS_BADGE: Record<string, string> = {
  pending: 'admin-badge-warn',
  approved: 'admin-badge-ok',
  rejected: 'admin-badge-danger',
};

export default function AdminCatchesPage() {
  return (
    <Suspense fallback={<div className="admin-page"><p className="admin-muted">불러오는 중...</p></div>}>
      <AdminCatchesContent />
    </Suspense>
  );
}

function AdminCatchesContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'pending';
  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const s = searchParams.get('status');
    if (s) setStatus(s);
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-catches', status, page],
    queryFn: async () => (await api.get(`/admin/catches?status=${status}&page=${page}`)).data.data,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, reviewStatus, note }: { id: string; reviewStatus: 'approved' | 'rejected'; note?: string }) =>
      api.patch(`/admin/catches/${id}/review`, { status: reviewStatus, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-catches'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setRejectId(null);
      setRejectNote('');
    },
  });

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1>기록 내역</h1>
        <p>인증 기록은 AI가 자동 검수합니다. S/A등급은 즉시 승인, B등급은 자동 반려됩니다.</p>
      </header>

      <div className="site-chips" style={{ marginBottom: 16 }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`site-chip${status === tab.key ? ' active' : ''}`}
            onClick={() => { setStatus(tab.key); setPage(1); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="admin-muted">불러오는 중...</p>
      ) : !data?.items?.length ? (
        <div className="admin-panel"><p className="admin-muted">해당 상태의 기록이 없습니다.</p></div>
      ) : (
        <div className="admin-catch-grid">
          {data.items.map((c: any) => (
            <article key={c.id} className="admin-catch-card">
              <div className="admin-catch-image">
                <img src={getImageUrl(c.imageUrl)!} alt="" />
              </div>
              <div className="admin-catch-body">
                <div className="admin-catch-top">
                  <span className={`admin-badge ${STATUS_BADGE[c.status] ?? ''}`}>{c.status}</span>
                  {c.certification?.grade && <span className="admin-badge">{c.certification.grade}등급</span>}
                </div>
                <p><strong>{c.user?.nickname}</strong></p>
                <p className="admin-muted">
                  {c.fishSpecies?.nameKo ?? '어종 미확인'}
                  {c.lengthCm ? ` · ${formatLength(c.lengthCm)}` : ''}
                </p>
                <p className="admin-muted">{c.locationName ? `📍 ${c.locationName}` : formatTimeAgo(c.createdAt)}</p>
                {c.certification?.errorMessage && (
                  <p className="admin-note">{c.certification.errorMessage}</p>
                )}
                {c.status === 'pending' && (
                  <div className="admin-row-actions">
                    <button type="button" className="admin-btn-primary" onClick={() => reviewMutation.mutate({ id: c.id, reviewStatus: 'approved' })}>
                      승인
                    </button>
                    <button type="button" className="admin-btn-danger" onClick={() => setRejectId(c.id)}>
                      반려
                    </button>
                  </div>
                )}
                {rejectId === c.id && (
                  <div className="admin-reject-box">
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="반려 사유 (선택)"
                      rows={2}
                      className="admin-input"
                    />
                    <div className="admin-row-actions">
                      <button type="button" className="admin-btn-danger" onClick={() => reviewMutation.mutate({ id: c.id, reviewStatus: 'rejected', note: rejectNote })}>
                        반려 확정
                      </button>
                      <button type="button" className="admin-btn-ghost" onClick={() => { setRejectId(null); setRejectNote(''); }}>취소</button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="admin-pagination">
          <button type="button" className="admin-btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>이전</button>
          <span className="admin-muted">{page} / {data.totalPages}</span>
          <button type="button" className="admin-btn-ghost" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>다음</button>
        </div>
      )}
    </div>
  );
}
