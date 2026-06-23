'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { formatTimeAgo } from '@/lib/utils';
import { getImageUrl } from '@/lib/images';
import { useAuthStore } from '@/store/auth.store';
import PageHeader from '@/components/layout/PageHeader';
import PageBackLink from '@/components/layout/PageBackLink';
import CatchPreviewCard from '@/components/community/CatchPreviewCard';
import ReportButton from '@/components/report/ReportButton';

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isLoggedIn, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const res = await api.get(`/posts/${id}`);
      return res.data.data;
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/posts/${id}/comments`, { content });
      return res.data.data;
    },
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['post', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/posts/${id}`),
    onSuccess: () => router.push('/community'),
  });

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    commentMutation.mutate(comment);
  };

  if (isLoading) {
    return (
      <main>
        <div className="site-container site-page-body site-empty">
          <div className="site-empty-icon">🎣</div>
          <p>불러오는 중...</p>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const isAuthor = user?.id === data.user.id;

  return (
    <main>
      <PageHeader title="커뮤니티" description="낚시 이야기 · 포인트 · 장비 정보" />

      <div className="site-container site-page-body page-narrow">
        <PageBackLink href="/community" label="목록으로" />
        <article className="detail-card">
          <h1 className="post-detail-title">{data.title}</h1>
          <div className="post-meta">
            <div className="post-meta-left">
              <Link
                href={`/profile/${encodeURIComponent(data.user.nickname)}`}
                className="post-author-link community-post-author"
              >
                <span className="community-post-avatar">{data.user.nickname[0]}</span>
                <span className="post-author-name">{data.user.nickname}</span>
              </Link>
              <span className="post-meta-muted">{formatTimeAgo(data.createdAt)}</span>
              <span className="post-meta-muted">👁 {data.viewCount}</span>
            </div>
            {isAuthor ? (
              <div className="post-author-actions">
                <Link href={`/community/${id}/edit`} className="site-btn-ghost-sm">
                  수정
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('게시글을 삭제하시겠습니까?')) deleteMutation.mutate();
                  }}
                  className="site-btn-danger"
                >
                  삭제
                </button>
              </div>
            ) : (
              <ReportButton
                targetType="post"
                targetId={data.id}
                ownerId={data.user.id}
                className="site-btn-ghost-sm"
              />
            )}
          </div>

          <hr className="site-divider" />

          <div className="content-prose">{data.content}</div>

          {data.imageUrl && (
            <div className="post-image-wrap">
              <img src={getImageUrl(data.imageUrl)!} alt="" />
            </div>
          )}

          {data.catchId && (
            <div className="catch-attach-box">
              <div className="catch-attach-label">🐟 첨부된 낚시 기록</div>
              <CatchPreviewCard catchId={data.catchId} />
            </div>
          )}
        </article>

        <section className="detail-card detail-card-spaced">
          <h2 className="comment-section-title">
            💬 댓글 {data._count?.comments ?? data.comments?.length ?? 0}개
          </h2>

          {data.comments?.map((c: {
            id: string;
            content: string;
            createdAt: string;
            user: { nickname: string };
          }) => (
            <div key={c.id} className="comment-item">
              <div className="comment-row">
                <Link href={`/profile/${encodeURIComponent(c.user.nickname)}`}>
                  <span className="community-post-avatar">{c.user.nickname[0]}</span>
                </Link>
                <div className="comment-body">
                  <div className="post-meta-left" style={{ marginBottom: 4 }}>
                    <span className="post-author-name" style={{ fontSize: 13 }}>{c.user.nickname}</span>
                    <span className="post-meta-muted">{formatTimeAgo(c.createdAt)}</span>
                  </div>
                  <p>{c.content}</p>
                </div>
              </div>
            </div>
          ))}

          {isLoggedIn ? (
            <form onSubmit={handleComment} className="comment-form">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="댓글을 입력하세요..."
                className="site-form-input comment-form-input"
              />
              <button
                type="submit"
                disabled={commentMutation.isPending || !comment.trim()}
                className="site-btn-sm"
                style={{ padding: '10px 20px' }}
              >
                등록
              </button>
            </form>
          ) : (
            <div className="comment-login-prompt">
              <Link href="/auth/login">로그인하고 댓글 달기 →</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
