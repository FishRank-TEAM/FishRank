'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatTimeAgo } from '@/lib/utils';

const STATUS_FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'open', label: '미처리' },
  { value: 'in_progress', label: '처리 중' },
  { value: 'resolved', label: '완료' },
  { value: 'dismissed', label: '보류' },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  bug: '버그·오류',
  feature: '기능 제안',
  improvement: '개선 의견',
  other: '기타',
};

const STATUS_LABELS: Record<string, string> = {
  open: '미처리',
  in_progress: '처리 중',
  resolved: '완료',
  dismissed: '보류',
};

const STATUS_BADGE: Record<string, string> = {
  open: 'admin-badge-warn',
  in_progress: 'admin-badge-event',
  resolved: 'admin-badge-ok',
  dismissed: '',
};

type FeedbackItem = {
  id: string;
  category: string;
  content: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  user: { id: string; nickname: string };
};

export default function AdminFeedbacksPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('open');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-feedbacks', page, status],
    queryFn: async () => (await api.get(`/admin/feedbacks?status=${status}&page=${page}`)).data.data,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      nextStatus,
      adminNote,
    }: {
      id: string;
      nextStatus: string;
      adminNote?: string;
    }) => api.patch(`/admin/feedbacks/${id}`, { status: nextStatus, adminNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1>피드백 관리</h1>
        <p>메인 페이지에서 접수된 사용자 의견을 확인하고 처리 상태를 변경할 수 있습니다.</p>
      </header>

      <div className="admin-filter-row">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`admin-filter-btn${status === item.value ? ' active' : ''}`}
            onClick={() => {
              setStatus(item.value);
              setPage(1);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="admin-muted">불러오는 중...</p>
      ) : !data?.items?.length ? (
        <div className="admin-panel">
          <p className="admin-muted">표시할 피드백이 없습니다.</p>
        </div>
      ) : (
        <div className="admin-feedback-list">
          {data.items.map((item: FeedbackItem) => (
            <FeedbackCard
              key={item.id}
              item={item}
              isPending={updateMutation.isPending}
              onUpdate={(nextStatus, adminNote) =>
                updateMutation.mutate({ id: item.id, nextStatus, adminNote })
              }
            />
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="admin-pagination">
          <button type="button" className="admin-btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            이전
          </button>
          <span className="admin-muted">
            {page} / {data.totalPages}
          </span>
          <button
            type="button"
            className="admin-btn-ghost"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

function FeedbackCard({
  item,
  isPending,
  onUpdate,
}: {
  item: FeedbackItem;
  isPending: boolean;
  onUpdate: (status: string, adminNote?: string) => void;
}) {
  const [note, setNote] = useState(item.adminNote ?? '');

  return (
    <article className="admin-feedback-card">
      <div className="admin-feedback-head">
        <span className={`admin-badge ${STATUS_BADGE[item.status] ?? ''}`}>
          {STATUS_LABELS[item.status] ?? item.status}
        </span>
        <span className="admin-badge">{CATEGORY_LABELS[item.category] ?? item.category}</span>
        <span className="admin-muted">
          {item.user.nickname} · {formatTimeAgo(item.createdAt)}
        </span>
      </div>

      <p className="admin-feedback-content">{item.content}</p>

      <label className="admin-feedback-note-label" htmlFor={`note-${item.id}`}>
        관리자 메모
        <textarea
          id={`note-${item.id}`}
          className="admin-feedback-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="내부 메모 (선택)"
          rows={2}
          maxLength={500}
        />
      </label>

      <div className="admin-row-actions">
        {item.status !== 'in_progress' && (
          <button
            type="button"
            className="admin-btn-ghost"
            disabled={isPending}
            onClick={() => onUpdate('in_progress', note.trim() || undefined)}
          >
            처리 중
          </button>
        )}
        {item.status !== 'resolved' && (
          <button
            type="button"
            className="admin-btn-primary"
            disabled={isPending}
            onClick={() => onUpdate('resolved', note.trim() || undefined)}
          >
            완료
          </button>
        )}
        {item.status !== 'dismissed' && (
          <button
            type="button"
            className="admin-btn-ghost"
            disabled={isPending}
            onClick={() => onUpdate('dismissed', note.trim() || undefined)}
          >
            보류
          </button>
        )}
        {item.status !== 'open' && (
          <button
            type="button"
            className="admin-btn-ghost"
            disabled={isPending}
            onClick={() => onUpdate('open', note.trim() || undefined)}
          >
            미처리로 되돌리기
          </button>
        )}
      </div>
    </article>
  );
}
