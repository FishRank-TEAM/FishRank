'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/images';
import { formatLength, formatTimeAgo } from '@/lib/utils';
import { RANKING_PERIOD_TABS, RANKING_SPECIES_LIST } from '@/lib/ranking.constants';

type RankingRow = {
  id: string;
  displayRank: number;
  effectiveScore: number;
  rankScore: number | null;
  lengthCm: number | null;
  status: string;
  recordType: string;
  imageUrl: string;
  createdAt: string;
  user: { id: string; nickname: string; email: string };
  fishSpecies: { id: number; nameKo: string; rarityWeight: number } | null;
  certification: { grade: string } | null;
  _count: { votes: number };
};

export default function AdminRankingsPage() {
  const [period, setPeriod] = useState('alltime');
  const [rankingType, setRankingType] = useState<'official' | 'unofficial'>('official');
  const [speciesId, setSpeciesId] = useState(1);
  const [page, setPage] = useState(1);
  const [editId, setEditId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-rankings', period, rankingType, speciesId, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        periodType: period,
        rankingType,
        speciesId: String(speciesId),
        page: String(page),
      });
      return (await api.get(`/admin/rankings?${params}`)).data.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; rankScore?: number; excludeFromRanking?: boolean }) =>
      api.patch(`/admin/catches/${payload.id}/ranking`, {
        ...(payload.rankScore !== undefined ? { rankScore: payload.rankScore } : {}),
        ...(payload.excludeFromRanking ? { excludeFromRanking: true } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rankings'] });
      setEditId(null);
      setEditScore('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/catches/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-rankings'] }),
  });

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1>랭킹 관리</h1>
        <p>공식·자랑 랭킹 항목을 조회하고 점수 조정·제외·삭제할 수 있습니다.</p>
      </header>

      <div className="admin-filter-row">
        {RANKING_PERIOD_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`admin-filter-btn${period === tab.key ? ' active' : ''}`}
            onClick={() => { setPeriod(tab.key); setPage(1); }}
          >
            {tab.label}
          </button>
        ))}
        <span className="admin-filter-divider" />
        <button
          type="button"
          className={`admin-filter-btn${rankingType === 'official' ? ' active' : ''}`}
          onClick={() => { setRankingType('official'); setPage(1); }}
        >
          인증
        </button>
        <button
          type="button"
          className={`admin-filter-btn${rankingType === 'unofficial' ? ' active' : ''}`}
          onClick={() => { setRankingType('unofficial'); setPage(1); }}
        >
          자랑
        </button>
      </div>

      <div className="site-chips" style={{ marginBottom: 16 }}>
        {RANKING_SPECIES_LIST.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`site-chip${speciesId === s.id ? ' active' : ''}`}
            onClick={() => { setSpeciesId(s.id); setPage(1); }}
          >
            {s.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="admin-muted">불러오는 중...</p>
      ) : !data?.items?.length ? (
        <div className="admin-panel"><p className="admin-muted">랭킹 항목이 없습니다.</p></div>
      ) : (
        <div className="admin-table-wrap admin-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>기록</th>
                <th>회원</th>
                <th>어종</th>
                <th>{rankingType === 'official' ? '점수' : '추천'}</th>
                <th>등급</th>
                <th>등록</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row: RankingRow) => (
                <tr key={row.id}>
                  <td><strong>#{row.displayRank}</strong></td>
                  <td>
                    <img src={getImageUrl(row.imageUrl)!} alt="" className="admin-table-thumb" />
                  </td>
                  <td>
                    <div>{row.user.nickname}</div>
                    <div className="admin-muted" style={{ fontSize: 11 }}>{row.user.email}</div>
                  </td>
                  <td>{row.fishSpecies?.nameKo ?? '-'}</td>
                  <td>
                    {rankingType === 'official'
                      ? (row.rankScore != null ? Number(row.rankScore).toFixed(1) : '-')
                      : row._count.votes}
                  </td>
                  <td>{row.certification?.grade ?? '-'}</td>
                  <td className="admin-muted">{formatTimeAgo(row.createdAt)}</td>
                  <td>
                    <div className="admin-row-actions admin-row-actions-compact">
                      {rankingType === 'official' && (
                        <button
                          type="button"
                          className="admin-btn-ghost"
                          onClick={() => {
                            setEditId(row.id);
                            setEditScore(row.rankScore != null ? String(row.rankScore) : '');
                          }}
                        >
                          점수
                        </button>
                      )}
                      <button
                        type="button"
                        className="admin-btn-ghost"
                        onClick={() => {
                          if (confirm('랭킹에서 제외하시겠습니까? (rankScore 제거)')) {
                            updateMutation.mutate({ id: row.id, excludeFromRanking: true });
                          }
                        }}
                      >
                        제외
                      </button>
                      <button
                        type="button"
                        className="admin-btn-danger"
                        onClick={() => {
                          if (confirm('기록을 삭제하시겠습니까?')) deleteMutation.mutate(row.id);
                        }}
                      >
                        삭제
                      </button>
                    </div>
                    {editId === row.id && (
                      <div className="admin-inline-edit">
                        <input
                          className="admin-input"
                          type="number"
                          step="0.1"
                          value={editScore}
                          onChange={(e) => setEditScore(e.target.value)}
                          placeholder="rank_score"
                        />
                        <button
                          type="button"
                          className="admin-btn-primary"
                          onClick={() => updateMutation.mutate({
                            id: row.id,
                            rankScore: Number(editScore),
                          })}
                        >
                          저장
                        </button>
                        <button type="button" className="admin-btn-ghost" onClick={() => setEditId(null)}>취소</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
