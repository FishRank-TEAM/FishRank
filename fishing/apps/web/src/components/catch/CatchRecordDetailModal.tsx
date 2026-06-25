'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/images';
import { formatLength, formatTimeAgo } from '@/lib/utils';
import SiteLoadingState from '@/components/layout/SiteLoadingState';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  approved: { label: '인증 완료', color: '#2e7d32', bg: '#e8f5e9' },
  pending: { label: '검토 중', color: '#e65100', bg: '#fff3e0' },
  rejected: { label: '거절됨', color: '#c62828', bg: '#ffebee' },
};

type Props = {
  catchId: string;
  onClose: () => void;
};

export default function CatchRecordDetailModal({ catchId, onClose }: Props) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['catch', catchId],
    queryFn: async () => (await api.get(`/catches/${catchId}`)).data.data,
    enabled: !!catchId,
  });

  const statusInfo = STATUS_LABELS[data?.status ?? ''] ?? STATUS_LABELS.pending;
  const imageSrc = data?.imageUrl ? getImageUrl(data.imageUrl) : null;
  const isRejected = data?.status === 'rejected';
  const rejectReason =
    data?.certification?.errorMessage ??
    (isRejected ? '인증 기준이 충족되지 않아 반려되었습니다.' : null);

  return (
    <div className="brag-detail-backdrop" onClick={onClose}>
      <div
        className="brag-detail-modal"
        role="dialog"
        aria-labelledby="catch-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="brag-detail-close" onClick={onClose} aria-label="닫기">
          ×
        </button>

        {isPending ? (
          <div style={{ padding: 32 }}>
            <SiteLoadingState compact icon="🎣" message="기록 불러오는 중..." />
          </div>
        ) : isError || !data ? (
          <div className="brag-detail-body">
            <p className="brag-detail-error">기록을 불러올 수 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="brag-detail-photo">
              {imageSrc ? (
                <img src={imageSrc} alt={data.fishSpecies?.nameKo ?? '낚시 기록 사진'} />
              ) : (
                <div className="brag-detail-photo-empty">🐟</div>
              )}
            </div>

            <div className="brag-detail-body">
              <h3 id="catch-detail-title" className="brag-detail-title">
                <Link href={`/profile/${data.user?.nickname}`} className="brag-detail-name">
                  {data.user?.nickname ?? '낚시인'}
                </Link>
                <span className="brag-detail-tag">인증</span>
                <span
                  className="catch-detail-status-badge"
                  style={{ background: statusInfo.bg, color: statusInfo.color }}
                >
                  {statusInfo.label}
                  {data.certification?.grade ? ` · ${data.certification.grade}` : ''}
                </span>
              </h3>

              <p className="brag-detail-meta">
                {[data.locationName, formatTimeAgo(data.createdAt)].filter(Boolean).join(' · ')}
              </p>
              {data.fishSpecies?.nameKo && (
                <p className="brag-detail-species">{data.fishSpecies.nameKo}</p>
              )}
              {data.lengthCm != null && (
                <p className="brag-detail-species">체장 {formatLength(data.lengthCm)}</p>
              )}

              {isRejected && rejectReason ? (
                <div className="catch-detail-reject-box">
                  <strong>거절 사유</strong>
                  <p>{rejectReason}</p>
                </div>
              ) : null}

              {data.status === 'pending' ? (
                <p className="brag-detail-memo brag-detail-memo--empty">AI 검토가 진행 중입니다.</p>
              ) : null}

              <div className={`brag-detail-actions${isRejected ? ' brag-detail-actions--stack' : ''}`}>
                {isRejected ? (
                  <Link href="/upload" className="site-btn-sm site-btn-primary">
                    다시 인증 촬영
                  </Link>
                ) : null}
                <button type="button" className="site-btn-ghost-sm" onClick={onClose}>
                  닫기
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
