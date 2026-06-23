'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { formatTimeAgo } from '@/lib/utils';
import { getImageUrl } from '@/lib/images';
import { useAuthStore } from '@/store/auth.store';
import PageHeader from '@/components/layout/PageHeader';

export default function CommunityPage() {
  const { isLoggedIn } = useAuthStore();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const res = await api.get('/posts?limit=30');
      return res.data.data;
    },
  });

  return (
    <main>
      <PageHeader title="커뮤니티" description="낚시 포인트, 장비, 기록 이야기를 나눠보세요">
        {isLoggedIn && (
          <Link href="/community/write" className="site-btn site-btn-primary">
            글 쓰기
          </Link>
        )}
      </PageHeader>

      <div className="site-container site-page-body" style={{ maxWidth: 800 }}>
        {!isLoggedIn && (
          <div className="site-alert">
            <p>로그인하면 글을 작성할 수 있습니다.</p>
            <Link href="/auth/login" className="site-btn site-btn-primary">
              로그인
            </Link>
          </div>
        )}

        {isLoading ? (
          <div className="site-empty"><p>글 불러오는 중...</p></div>
        ) : data?.items?.length > 0 ? (
          <div className="community-post-list">
            {data.items.map((post: {
              id: string;
              title: string;
              content: string;
              createdAt: string;
              imageUrl?: string;
              viewCount: number;
              user: { nickname: string };
              _count?: { comments: number };
            }) => (
              <div
                key={post.id}
                role="button"
                tabIndex={0}
                className="community-post"
                onClick={() => router.push(`/community/${post.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/community/${post.id}`);
                  }
                }}
              >
                <div className="community-post-row">
                  <div className="community-post-main">
                    <div className="community-post-title">{post.title}</div>
                    <div className="community-post-excerpt">{post.content}</div>
                    <div className="community-post-footer">
                      <Link
                        href={`/profile/${encodeURIComponent(post.user.nickname)}`}
                        className="community-post-author"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="community-post-avatar">{post.user.nickname[0]}</span>
                        <span className="post-author-name" style={{ fontSize: 12 }}>{post.user.nickname}</span>
                      </Link>
                      <span className="post-meta-muted">{formatTimeAgo(post.createdAt)}</span>
                    </div>
                  </div>
                  <div className="community-post-stats">
                    {post.imageUrl && (
                      <img src={getImageUrl(post.imageUrl)!} alt="" className="community-post-thumb" />
                    )}
                    <span>댓글 {post._count?.comments ?? 0}</span>
                    <span>조회 {post.viewCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="site-empty">
            <p>첫 번째 글을 작성해보세요.</p>
            {isLoggedIn && (
              <Link href="/community/write" className="site-btn site-btn-primary" style={{ marginTop: 16 }}>
                글 쓰기
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
