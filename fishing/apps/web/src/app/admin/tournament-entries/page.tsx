'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatTimeAgo } from '@/lib/utils';

export default function AdminTournamentEntriesPage() {
  const [page, setPage] = useState(1);
  const [tournamentId, setTournamentId] = useState('');

  const { data: tournaments } = useQuery({
    queryKey: ['admin-tournaments-list'],
    queryFn: async () => (await api.get('/tournaments')).data.data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tournament-entries', page, tournamentId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (tournamentId) params.set('tournamentId', tournamentId);
      return (await api.get(`/admin/tournament-entries?${params}`)).data.data;
    },
  });

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1>대회 참가 관리</h1>
        <p>대회별 참가자·결제 상태를 확인합니다.</p>
        <Link href="/admin/tournaments" className="admin-link">← 대회 관리로</Link>
      </header>

      <div className="admin-filter-row">
        <button
          type="button"
          className={`admin-filter-btn${!tournamentId ? ' active' : ''}`}
          onClick={() => { setTournamentId(''); setPage(1); }}
        >
          전체 대회
        </button>
        {(Array.isArray(tournaments) ? tournaments : tournaments?.items ?? []).map((t: { id: string; title: string }) => (
          <button
            key={t.id}
            type="button"
            className={`admin-filter-btn${tournamentId === t.id ? ' active' : ''}`}
            onClick={() => { setTournamentId(t.id); setPage(1); }}
          >
            {t.title}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="admin-muted">불러오는 중...</p>
      ) : !data?.items?.length ? (
        <div className="admin-panel"><p className="admin-muted">참가 기록이 없습니다.</p></div>
      ) : (
        <div className="admin-table-wrap admin-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>대회</th>
                <th>참가자</th>
                <th>이메일</th>
                <th>결제</th>
                <th>순위</th>
                <th>참가일</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((e: {
                id: string;
                paymentStatus: string;
                rank: number | null;
                joinedAt: string;
                user: { nickname: string; email: string };
                tournament: { title: string; status: string };
              }) => (
                <tr key={e.id}>
                  <td>
                    <div>{e.tournament.title}</div>
                    <span className="admin-muted">{e.tournament.status}</span>
                  </td>
                  <td>{e.user.nickname}</td>
                  <td className="admin-muted">{e.user.email}</td>
                  <td><span className="admin-badge">{e.paymentStatus}</span></td>
                  <td>{e.rank ?? '-'}</td>
                  <td className="admin-muted">{formatTimeAgo(e.joinedAt)}</td>
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
