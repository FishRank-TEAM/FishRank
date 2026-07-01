'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

type SpeciesRow = {
  id: number;
  nameKo: string;
  nameEn: string | null;
  category: string;
  rarityWeight: number;
  minLengthCm: number | null;
  _count: { catches: number };
};

export default function AdminSpeciesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [rarity, setRarity] = useState('');
  const [minSize, setMinSize] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-species', page, query],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (query) params.set('search', query);
      return (await api.get(`/admin/species?${params}`)).data.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; rarityWeight?: number; minLengthCm?: number }) =>
      api.patch(`/admin/species/${payload.id}`, {
        ...(payload.rarityWeight !== undefined ? { rarityWeight: payload.rarityWeight } : {}),
        ...(payload.minLengthCm !== undefined ? { minLengthCm: payload.minLengthCm } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-species'] });
      setEditId(null);
    },
  });

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1>어종 관리</h1>
        <p>랭킹 점수에 반영되는 희귀도 가중치와 법정 최소 크기를 조정합니다.</p>
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
          placeholder="한글·영문 어종명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="admin-btn-primary">검색</button>
      </form>

      {isLoading ? (
        <p className="admin-muted">불러오는 중...</p>
      ) : !data?.items?.length ? (
        <div className="admin-panel"><p className="admin-muted">어종이 없습니다.</p></div>
      ) : (
        <div className="admin-table-wrap admin-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>한글명</th>
                <th>분류</th>
                <th>희귀도</th>
                <th>법정(cm)</th>
                <th>기록 수</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((s: SpeciesRow) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td><strong>{s.nameKo}</strong>{s.nameEn ? <div className="admin-muted">{s.nameEn}</div> : null}</td>
                  <td>{s.category}</td>
                  <td>{Number(s.rarityWeight).toFixed(1)}</td>
                  <td>{s.minLengthCm ?? '-'}</td>
                  <td>{s._count.catches}</td>
                  <td>
                    {editId === s.id ? (
                      <div className="admin-inline-edit">
                        <input
                          className="admin-input"
                          type="number"
                          step="0.1"
                          value={rarity}
                          onChange={(e) => setRarity(e.target.value)}
                          placeholder="희귀도"
                        />
                        <input
                          className="admin-input"
                          type="number"
                          value={minSize}
                          onChange={(e) => setMinSize(e.target.value)}
                          placeholder="법정 cm"
                        />
                        <button
                          type="button"
                          className="admin-btn-primary"
                          onClick={() => updateMutation.mutate({
                            id: s.id,
                            rarityWeight: rarity ? Number(rarity) : undefined,
                            minLengthCm: minSize ? Number(minSize) : undefined,
                          })}
                        >
                          저장
                        </button>
                        <button type="button" className="admin-btn-ghost" onClick={() => setEditId(null)}>취소</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="admin-btn-ghost"
                        onClick={() => {
                          setEditId(s.id);
                          setRarity(String(s.rarityWeight));
                          setMinSize(s.minLengthCm != null ? String(s.minLengthCm) : '');
                        }}
                      >
                        수정
                      </button>
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
