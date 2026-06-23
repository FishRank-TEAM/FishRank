'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/images';
import { formatLength, formatTimeAgo } from '@/lib/utils';

export default function AdminReportsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-flagged-reports'],
    queryFn: async () => (await api.get('/admin/reports/flagged?minCount=3')).data.data,
  });

  const resolveMutation = useMutation({
    mutationFn: ({
      targetType,
      targetId,
      action,
    }: {
      targetType: 'catch' | 'post';
      targetId: string;
      action: 'dismiss' | 'delete';
    }) => api.patch(`/admin/reports/${targetType}/${targetId}`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flagged-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1>신고 관리</h1>
        <p>신고가 3건 이상 접수된 콘텐츠를 신고 수가 많은 순으로 표시합니다.</p>
      </header>

      {isLoading ? (
        <p className="admin-muted">불러오는 중...</p>
      ) : !data?.length ? (
        <div className="admin-panel">
          <p className="admin-muted">현재 검토가 필요한 신고 대상이 없습니다.</p>
        </div>
      ) : (
        <div className="admin-report-list">
          {data.map((item: {
            targetType: 'catch' | 'post';
            targetId: string;
            reportCount: number;
            reports: Array<{ reason: string; detail: string | null; createdAt: string; reporter: { nickname: string } }>;
            target: any;
          }) => (
            <article key={`${item.targetType}-${item.targetId}`} className="admin-report-card">
              <div className="admin-report-head">
                <span className="admin-badge admin-badge-danger">신고 {item.reportCount}건</span>
                <span className="admin-badge">{item.targetType === 'catch' ? '낚시 기록' : '게시글'}</span>
              </div>

              {item.targetType === 'catch' && item.target && (
                <div className="admin-report-body">
                  {item.target.imageUrl && (
                    <img
                      src={getImageUrl(item.target.imageUrl)!}
                      alt=""
                      className="admin-report-thumb"
                    />
                  )}
                  <div>
                    <p><strong>{item.target.user?.nickname}</strong></p>
                    <p className="admin-muted">
                      {item.target.fishSpecies?.nameKo ?? '어종 미확인'}
                      {item.target.lengthCm ? ` · ${formatLength(item.target.lengthCm)}` : ''}
                      {item.target.certification?.grade ? ` · ${item.target.certification.grade}등급` : ''}
                    </p>
                    {item.target.locationName && (
                      <p className="admin-muted">📍 {item.target.locationName}</p>
                    )}
                  </div>
                </div>
              )}

              {item.targetType === 'post' && item.target && (
                <div className="admin-report-body">
                  <div>
                    <p><strong>{item.target.title}</strong></p>
                    <p className="admin-muted">{item.target.user?.nickname} · {formatTimeAgo(item.target.createdAt)}</p>
                    <p className="admin-note">{item.target.content?.slice(0, 120)}{(item.target.content?.length ?? 0) > 120 ? '...' : ''}</p>
                    <Link href={`/community/${item.targetId}`} className="admin-link" target="_blank">
                      게시글 보기 →
                    </Link>
                  </div>
                </div>
              )}

              <ul className="admin-report-reasons">
                {item.reports.map((r, i) => (
                  <li key={i}>
                    <strong>{r.reason}</strong>
                    <span className="admin-muted"> · {r.reporter.nickname} · {formatTimeAgo(r.createdAt)}</span>
                    {r.detail && <p className="admin-note">{r.detail}</p>}
                  </li>
                ))}
              </ul>

              <div className="admin-row-actions">
                <button
                  type="button"
                  className="admin-btn-danger"
                  disabled={resolveMutation.isPending}
                  onClick={() => {
                    if (!confirm('콘텐츠를 삭제하고 신고를 종료할까요?')) return;
                    resolveMutation.mutate({
                      targetType: item.targetType,
                      targetId: item.targetId,
                      action: 'delete',
                    });
                  }}
                >
                  콘텐츠 삭제
                </button>
                <button
                  type="button"
                  className="admin-btn-ghost"
                  disabled={resolveMutation.isPending}
                  onClick={() => {
                    if (!confirm('신고를 무시하고 목록에서 제외할까요?')) return;
                    resolveMutation.mutate({
                      targetType: item.targetType,
                      targetId: item.targetId,
                      action: 'dismiss',
                    });
                  }}
                >
                  신고 무시
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
