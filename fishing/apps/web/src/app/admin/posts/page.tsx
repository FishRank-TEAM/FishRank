'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { formatTimeAgo } from '@/lib/utils';

export default function AdminPostsPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-posts', page],
    queryFn: async () => (await api.get(`/admin/posts?page=${page}`)).data.data,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-posts'] }),
  });

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1>게시글 관리</h1>
        <p>커뮤니티 게시글을 검열하고 삭제할 수 있습니다.</p>
      </header>

      {isLoading ? (
        <p className="admin-muted">불러오는 중...</p>
      ) : !data?.items?.length ? (
        <div className="admin-panel"><p className="admin-muted">게시글이 없습니다.</p></div>
      ) : (
        <div className="admin-panel">
          <ul className="admin-list admin-list-spaced">
            {data.items.map((post: any) => (
              <li key={post.id} className="admin-post-row">
                <div>
                  <Link href={`/community/${post.id}`} className="admin-post-title">{post.title}</Link>
                  <p className="admin-muted">
                    {post.user?.nickname} · {formatTimeAgo(post.createdAt)} · 댓글 {post._count?.comments ?? 0} · 조회 {post.viewCount}
                  </p>
                  <p className="admin-post-preview">{post.content.slice(0, 120)}{post.content.length > 120 ? '…' : ''}</p>
                </div>
                <button
                  type="button"
                  className="admin-btn-danger"
                  onClick={() => {
                    if (window.confirm('이 게시글을 삭제할까요?')) deleteMutation.mutate(post.id);
                  }}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
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
