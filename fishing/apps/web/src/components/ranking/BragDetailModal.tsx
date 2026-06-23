'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/images';
import { formatTimeAgo } from '@/lib/utils';
import CatchVoteButton from '@/components/ranking/CatchVoteButton';
import ReportButton from '@/components/report/ReportButton';
import SpeciesSearchInput from '@/components/species/SpeciesSearchInput';
import type { RankingItem } from '@/components/RankingCard';

type Props = {
  item: RankingItem;
  onClose: () => void;
  editable?: boolean;
  onSaved?: () => void;
  onDeleted?: () => void;
};

export default function BragDetailModal({ item, onClose, editable = false, onSaved, onDeleted }: Props) {
  const queryClient = useQueryClient();
  const imageSrc = getImageUrl(item.catch.imageUrl);
  const meta = [item.catch.locationName, formatTimeAgo(item.catch.createdAt)]
    .filter(Boolean)
    .join(' · ');

  const [editing, setEditing] = useState(false);
  const [memo, setMemo] = useState(item.catch.memo ?? '');
  const [locationName, setLocationName] = useState(item.catch.locationName ?? '');
  const [fishSpeciesId, setFishSpeciesId] = useState(
    item.fishSpecies?.id ? String(item.fishSpecies.id) : '',
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMemo(item.catch.memo ?? '');
    setLocationName(item.catch.locationName ?? '');
    setFishSpeciesId(item.fishSpecies?.id ? String(item.fishSpecies.id) : '');
    setEditing(false);
    setError('');
  }, [item]);

  const { data: speciesList } = useQuery({
    queryKey: ['species'],
    queryFn: async () => {
      const res = await api.get('/species');
      return res.data.data;
    },
    enabled: editing,
  });

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, string | number> = {
        memo,
        locationName,
      };
      if (fishSpeciesId) {
        payload.fishSpeciesId = Number(fishSpeciesId);
      }
      await api.patch(`/catches/${item.catch.id}/personal`, payload);
      await queryClient.invalidateQueries({ queryKey: ['my-catches'] });
      await queryClient.invalidateQueries({ queryKey: ['rankings'] });
      await queryClient.invalidateQueries({ queryKey: ['brag-feed'] });
      onSaved?.();
      setEditing(false);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof message === 'string' ? message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('이 자랑 기록을 삭제할까요? 삭제 후에는 복구할 수 없습니다.')) return;

    setDeleting(true);
    setError('');
    try {
      await api.delete(`/catches/${item.catch.id}/personal`);
      await queryClient.invalidateQueries({ queryKey: ['my-catches'] });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await queryClient.invalidateQueries({ queryKey: ['rankings'] });
      await queryClient.invalidateQueries({ queryKey: ['brag-feed'] });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      onDeleted?.();
      onClose();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof message === 'string' ? message : '삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="brag-detail-backdrop" onClick={onClose}>
      <div
        className="brag-detail-modal"
        role="dialog"
        aria-labelledby="brag-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="brag-detail-close" onClick={onClose} aria-label="닫기">
          ×
        </button>

        <div className="brag-detail-photo">
          {imageSrc ? (
            <img src={imageSrc} alt="" />
          ) : (
            <div className="brag-detail-photo-empty">🐟</div>
          )}
        </div>

        <div className="brag-detail-body">
          <h3 id="brag-detail-title" className="brag-detail-title">
            <Link href={`/profile/${item.user.nickname}`} className="brag-detail-name">
              {item.user.nickname}
            </Link>
            <span className="brag-detail-tag">자랑</span>
          </h3>

          {!editing && meta && <p className="brag-detail-meta">{meta}</p>}
          {!editing && item.fishSpecies?.nameKo && (
            <p className="brag-detail-species">{item.fishSpecies.nameKo}</p>
          )}

          {editing ? (
            <div className="brag-detail-form">
              <label className="brag-detail-field">
                <span>어종</span>
                <SpeciesSearchInput
                  species={speciesList ?? []}
                  value={fishSpeciesId}
                  onChange={setFishSpeciesId}
                />
              </label>
              <label className="brag-detail-field">
                <span>낚시 장소</span>
                <input
                  type="text"
                  className="site-form-input"
                  value={locationName}
                  onChange={(event) => setLocationName(event.target.value)}
                  placeholder="예: 포항 구룡포"
                />
              </label>
              <label className="brag-detail-field">
                <span>메모</span>
                <textarea
                  className="site-form-input"
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  placeholder="오늘의 낚시 이야기..."
                  rows={4}
                />
              </label>
              {error && <p className="brag-detail-error">{error}</p>}
              <div className="brag-detail-form-actions">
                <button
                  type="button"
                  className="site-btn-sm"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="site-btn-sm site-btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {item.catch.memo ? (
                <p className="brag-detail-memo">{item.catch.memo}</p>
              ) : (
                <p className="brag-detail-memo brag-detail-memo--empty">메모 없음</p>
              )}

              <div className="brag-detail-actions">
                {editable ? (
                  <>
                    <button
                      type="button"
                      className="site-btn-sm site-btn-primary"
                      onClick={() => setEditing(true)}
                      disabled={deleting}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="site-btn-sm brag-detail-delete-btn"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? '삭제 중...' : '삭제'}
                    </button>
                  </>
                ) : (
                  <>
                    <CatchVoteButton
                      catchId={item.catch.id}
                      initialVoteCount={item.voteCount ?? Number(item.rankScore) ?? 0}
                      ownerId={item.user.id}
                    />
                    <ReportButton
                      targetType="catch"
                      targetId={item.catch.id}
                      ownerId={item.user.id}
                      className="brag-detail-report"
                    />
                  </>
                )}
              </div>
              {error && <p className="brag-detail-error">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
