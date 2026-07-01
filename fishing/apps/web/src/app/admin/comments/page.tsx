'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatTimeAgo } from '@/lib/utils';

export default function AdminCommentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-comments', page, query],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (query) params.set('search', query);
      return (await api.get(`/admin/comments?${params}`)).data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/comments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-comments'] }),
  });

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1>댓글 관리</h1>
        <p>커뮤니티 댓글을 검색하고 삭제할 수 있습니다.</p>
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
          placeholder="댓글·닉네임·게시글 제목 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="admin-btn-primary">검색</button>
      </form>

      {isLoading ? (
        <p className="admin-muted">불러오는 중...</p>
      ) : !data?.items?.length ? (
        <div className="admin-panel"><p className="admin-muted">댓글이 없습니다.</p></div>
      ) : (
        <div className="admin-comment-list">
          {data.items.map((c: {
            id: string;
            content: string;
            createdAt: string;
            user: { nickname: string; email: string };
            post: { id: string; title: string };
          }) => (
            <article key={c.id} className="admin-comment-card">
              <div className="admin-comment-head">
                <div>
                  <strong>{c.user.nickname}</strong>
                  <span className="admin-muted"> · {c.user.email}</span>
                </div>
                <span className="admin-muted">{formatTimeAgo(c.createdAt)}</span>
              </div>
              <p className="admin-comment-body">{c.content}</p>
              <div className="admin-comment-foot">
                <Link href={`/community/${c.post.id}`} className="admin-link">
                  게시글: {c.post.title}
                </Link>
                <button
                  type="button"
                  className="admin-btn-danger"
                  onClick={() => {
                    if (confirm('이 댓글을 삭제하시겠습니까?')) deleteMutation.mutate(c.id);
                  }}
                >
                  삭제
                </button>
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
