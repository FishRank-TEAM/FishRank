'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { COMMUNITY_TAGS, type CommunitySort, type CommunityTagKey } from '@fishrank/shared';
import api from '@/lib/api';
import { cn, formatTimeAgo } from '@/lib/utils';
import { getImageUrl } from '@/lib/images';
import { useAuthStore } from '@/store/auth.store';
import PageBanner from '@/components/layout/PageBanner';
import SiteEmptyState from '@/components/layout/SiteEmptyState';
import SiteErrorState from '@/components/layout/SiteErrorState';
import SiteLoadingState from '@/components/layout/SiteLoadingState';
import UserAvatar from '@/components/ui/UserAvatar';
import PostTagBadges from '@/components/community/PostTagBadges';

const SORT_TABS = [
  { key: 'latest' as const, label: '최신순' },
  { key: 'popular' as const, label: '인기순' },
];

export default function CommunityPage() {
  const { isLoggedIn } = useAuthStore();
  const router = useRouter();
  const [sort, setSort] = useState<CommunitySort>('latest');
  const [tag, setTag] = useState<CommunityTagKey | ''>('');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['posts', sort, tag],
    queryFn: async () => {
      const res = await api.get('/posts', {
        params: {
          limit: 30,
          sort,
          ...(tag ? { tag } : {}),
        },
      });
      return res.data.data;
    },
  });

  return (
    <main>
      <div className="site-container site-page-body" style={{ maxWidth: 800 }}>
        <PageBanner
          title="커뮤니티"
          description="낚시 포인트, 장비, 기록 이야기를 나눠보세요"
          action={
            isLoggedIn ? (
              <Link
                href="/community/write"
                className="shrink-0 rounded-lg bg-[#22C55E] px-5 py-2 text-sm font-semibold text-white no-underline transition hover:bg-[#1db954]"
              >
                ✏️ 글 쓰기
              </Link>
            ) : undefined
          }
        />

        {!isLoggedIn && (
          <div className="site-alert mb-5">
            <p>로그인하면 글을 작성할 수 있습니다.</p>
            <Link href="/auth/login" className="site-btn site-btn-primary">
              로그인
            </Link>
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3">
          <div className="flex items-center gap-2" role="tablist" aria-label="정렬">
            {SORT_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={sort === tab.key}
                className={cn(
                  'rounded-md px-4 py-1.5 text-sm',
                  sort === tab.key
                    ? 'bg-[#0A2540] font-medium text-white'
                    : 'border border-gray-200 text-gray-500',
                )}
                onClick={() => setSort(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mx-1 h-5 w-px bg-gray-200" aria-hidden />

          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="주제">
            <button
              type="button"
              role="tab"
              aria-selected={tag === ''}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                tag === ''
                  ? 'border border-[#0A2540] bg-[#0A2540] text-white'
                  : 'border border-gray-200 text-gray-500 hover:border-[#0A2540] hover:text-[#0A2540]',
              )}
              onClick={() => setTag('')}
            >
              전체
            </button>
            {COMMUNITY_TAGS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tag === t.key}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium',
                  tag === t.key
                    ? 'border border-[#0A2540] bg-[#0A2540] text-white'
                    : 'border border-gray-200 text-gray-500 hover:border-[#0A2540] hover:text-[#0A2540]',
                )}
                onClick={() => setTag(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <SiteLoadingState icon="💬" message="글 불러오는 중..." />
        ) : isError ? (
          <SiteErrorState
            icon="⚠️"
            title="글 목록을 불러오지 못했습니다"
            description="네트워크 연결을 확인한 뒤 다시 시도해 주세요."
            onRetry={() => refetch()}
          />
        ) : data?.items?.length > 0 ? (
          <div className={cn('flex flex-col gap-3', isFetching && 'opacity-60')}>
            {data.items.map((post: {
              id: string;
              title: string;
              content: string;
              createdAt: string;
              imageUrl?: string;
              tags?: string[];
              viewCount: number;
              user: { nickname: string; profileImage?: string | null };
              _count?: { comments: number };
            }) => (
              <div
                key={post.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer rounded-xl border border-gray-100 bg-white px-5 py-4 transition hover:border-gray-300"
                onClick={() => router.push(`/community/${post.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/community/${post.id}`);
                  }
                }}
              >
                <PostTagBadges tags={post.tags} className="mb-2" />
                <div className="mb-1 truncate text-[15px] font-bold text-gray-900">{post.title}</div>
                <div className="mb-3 truncate text-[13px] text-gray-500">
                  {post.content.length > 120 ? `${post.content.slice(0, 120)}…` : post.content}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Link
                      href={`/profile/${encodeURIComponent(post.user.nickname)}`}
                      className="flex min-w-0 items-center gap-2 no-underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <UserAvatar
                        nickname={post.user.nickname}
                        profileImage={post.user.profileImage}
                        className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0A2540] text-[10px] font-bold text-white"
                        style={post.user.profileImage ? undefined : { backgroundColor: '#0A2540' }}
                      />
                      <span className="truncate text-xs font-medium text-gray-700">
                        {post.user.nickname}
                      </span>
                    </Link>
                    <span className="shrink-0 text-xs text-gray-400">{formatTimeAgo(post.createdAt)}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-gray-400">
                    {post.imageUrl && (
                      <img
                        src={getImageUrl(post.imageUrl)!}
                        alt=""
                        className="h-10 w-10 rounded-md border border-gray-100 object-cover"
                      />
                    )}
                    <span>댓글 {post._count?.comments ?? 0}</span>
                    <span>조회 {post.viewCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <SiteEmptyState
            icon="📝"
            title={tag ? '해당 태그의 글이 없습니다' : '아직 작성된 글이 없습니다'}
            description="첫 번째 낚시 이야기를 커뮤니티에 남겨 보세요."
            action={
              isLoggedIn ? (
                <Link href="/community/write" className="site-btn site-btn-primary">
                  글 쓰기
                </Link>
              ) : (
                <Link href="/auth/login" className="site-btn site-btn-primary">
                  로그인하고 글 쓰기
                </Link>
              )
            }
          />
        )}
      </div>
    </main>
  );
}
