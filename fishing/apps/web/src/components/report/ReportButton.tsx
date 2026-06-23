'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const REASONS = [
  '허위 기록',
  '부적절한 사진',
  '타인 사칭',
  '스팸/광고',
  '기타',
];

function formatReportError(error: unknown): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return '신고 접수에 실패했습니다.';
}

type Props = {
  targetType: 'catch' | 'post';
  targetId: string;
  ownerId?: string;
  className?: string;
};

export default function ReportButton({ targetType, targetId, ownerId, className = 'report-btn' }: Props) {
  const { isLoggedIn, user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/reports', {
        targetType,
        targetId,
        reason,
        detail: detail.trim() || undefined,
      });
      return res.data.data;
    },
    onSuccess: () => {
      setSubmitted(true);
      setOpen(false);
      setDetail('');
    },
  });

  if (!isLoggedIn) {
    return (
      <Link href="/auth/login" className={className}>
        신고
      </Link>
    );
  }

  if (ownerId && user?.id === ownerId) return null;

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        disabled={submitted}
      >
        {submitted ? '신고됨' : '신고'}
      </button>

      {open && (
        <div className="report-modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className="report-modal"
            role="dialog"
            aria-labelledby="report-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="report-modal-title" className="report-modal-title">콘텐츠 신고</h3>
            <p className="report-modal-desc">신고는 검토 후 처리됩니다. 허위 신고 시 제재될 수 있습니다.</p>

            <label className="report-modal-label">
              사유
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="admin-input"
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>

            <label className="report-modal-label">
              상세 내용 (선택)
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                className="admin-input"
                rows={3}
                maxLength={500}
                placeholder="추가 설명이 있으면 입력해 주세요"
              />
            </label>

            {mutation.isError && (
              <p className="report-modal-error">
                {formatReportError(mutation.error)}
              </p>
            )}

            <div className="report-modal-actions">
              <button
                type="button"
                className="admin-btn-primary"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? '접수 중...' : '신고하기'}
              </button>
              <button type="button" className="admin-btn-ghost" onClick={() => setOpen(false)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
