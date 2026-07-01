'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatTimeAgo } from '@/lib/utils';

const ROLE_FILTERS = [
  { value: 'all', label: '전체 역할' },
  { value: 'user', label: '일반' },
  { value: 'admin', label: '관리자' },
];

const STATUS_FILTERS = [
  { value: 'active', label: '활성' },
  { value: 'suspended', label: '정지' },
  { value: 'all', label: '전체' },
];

type UserRow = {
  id: string;
  email: string;
  nickname: string;
  role: string;
  provider: string;
  createdAt: string;
  deletedAt: string | null;
  _count: {
    catches: number;
    posts: number;
    comments: number;
    userFeedbacks: number;
    contentReports: number;
  };
};

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [accountStatus, setAccountStatus] = useState('active');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, query, role, accountStatus],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        role,
        accountStatus,
      });
      if (query) params.set('search', query);
      return (await api.get(`/admin/users?${params}`)).data.data;
    },
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-user', selectedId],
    queryFn: async () => (await api.get(`/admin/users/${selectedId}`)).data.data,
    enabled: !!selectedId,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; role?: string; accountStatus?: string }) =>
      api.patch(`/admin/users/${payload.id}`, {
        ...(payload.role ? { role: payload.role } : {}),
        ...(payload.accountStatus ? { accountStatus: payload.accountStatus } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1>회원 관리</h1>
        <p>회원 검색, 역할 변경, 계정 정지·복구를 관리합니다.</p>
      </header>

      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <input
          className="admin-input admin-toolbar-search"
          placeholder="이메일·닉네임 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="admin-btn-primary">검색</button>
      </form>

      <div className="admin-filter-row">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`admin-filter-btn${role === f.value ? ' active' : ''}`}
            onClick={() => { setRole(f.value); setPage(1); }}
          >
            {f.label}
          </button>
        ))}
        <span className="admin-filter-divider" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`admin-filter-btn${accountStatus === f.value ? ' active' : ''}`}
            onClick={() => { setAccountStatus(f.value); setPage(1); }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="admin-split-layout">
        <section className="admin-panel admin-panel-fill">
          {isLoading ? (
            <p className="admin-muted">불러오는 중...</p>
          ) : !data?.items?.length ? (
            <p className="admin-muted">조건에 맞는 회원이 없습니다.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table-selectable">
                <thead>
                  <tr>
                    <th>닉네임</th>
                    <th>이메일</th>
                    <th>역할</th>
                    <th>기록</th>
                    <th>가입</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((u: UserRow) => (
                    <tr
                      key={u.id}
                      className={selectedId === u.id ? 'selected' : ''}
                      onClick={() => setSelectedId(u.id)}
                    >
                      <td><strong>{u.nickname}</strong></td>
                      <td className="admin-muted">{u.email}</td>
                      <td>
                        <span className={`admin-badge${u.role === 'admin' ? ' admin-badge-event' : ''}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>{u._count.catches}</td>
                      <td className="admin-muted">{formatTimeAgo(u.createdAt)}</td>
                      <td>
                        {u.deletedAt ? (
                          <span className="admin-badge admin-badge-danger">정지</span>
                        ) : (
                          <span className="admin-badge admin-badge-ok">활성</span>
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
        </section>

        <aside className="admin-panel admin-detail-panel">
          {!selectedId ? (
            <p className="admin-muted">회원을 선택하면 상세 정보가 표시됩니다.</p>
          ) : detailLoading ? (
            <p className="admin-muted">상세 불러오는 중...</p>
          ) : detail ? (
            <>
              <h2>{detail.user.nickname}</h2>
              <p className="admin-muted">{detail.user.email}</p>
              <p className="admin-muted">
                {detail.user.provider} · {new Date(detail.user.createdAt).toLocaleDateString('ko-KR')} 가입
              </p>

              <div className="admin-detail-stats">
                <div><strong>{detail.user._count.catches}</strong><span>기록</span></div>
                <div><strong>{detail.user._count.posts}</strong><span>글</span></div>
                <div><strong>{detail.user._count.comments}</strong><span>댓글</span></div>
                <div><strong>{detail.user._count.userFeedbacks}</strong><span>피드백</span></div>
              </div>

              <div className="admin-row-actions">
                {detail.user.role === 'admin' ? (
                  <button
                    type="button"
                    className="admin-btn-ghost"
                    onClick={() => updateMutation.mutate({ id: detail.user.id, role: 'user' })}
                  >
                    일반 회원으로
                  </button>
                ) : (
                  <button
                    type="button"
                    className="admin-btn-primary"
                    onClick={() => updateMutation.mutate({ id: detail.user.id, role: 'admin' })}
                  >
                    관리자 승급
                  </button>
                )}
                {detail.user.deletedAt ? (
                  <button
                    type="button"
                    className="admin-btn-primary"
                    onClick={() => updateMutation.mutate({ id: detail.user.id, accountStatus: 'active' })}
                  >
                    계정 복구
                  </button>
                ) : (
                  <button
                    type="button"
                    className="admin-btn-danger"
                    onClick={() => {
                      if (confirm('이 회원을 정지하시겠습니까?')) {
                        updateMutation.mutate({ id: detail.user.id, accountStatus: 'suspended' });
                      }
                    }}
                  >
                    계정 정지
                  </button>
                )}
              </div>

              <Link href={`/profile/${encodeURIComponent(detail.user.nickname)}`} className="admin-link">
                공개 프로필 보기 →
              </Link>

              {detail.recentCatches?.length > 0 && (
                <div className="admin-detail-section">
                  <h3>최근 기록</h3>
                  <ul className="admin-list">
                    {detail.recentCatches.map((c: { id: string; status: string; fishSpecies?: { nameKo: string }; lengthCm?: number }) => (
                      <li key={c.id} className="admin-list-item">
                        <span>{c.fishSpecies?.nameKo ?? '어종'} · {c.status}</span>
                        <span className="admin-muted">{c.lengthCm ? `${c.lengthCm}cm` : '-'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
