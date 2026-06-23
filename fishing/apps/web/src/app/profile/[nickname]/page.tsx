'use client';

import { use, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { formatTimeAgo, formatLength } from '@/lib/utils';
import { formatFishingCategory, formatActivityRegionLabel } from '@/lib/profile';
import { getImageUrl } from '@/lib/images';
import { useAuthStore } from '@/store/auth.store';
import ProfileHeader, { ProfileStatsBar } from '@/components/layout/ProfileHeader';
import ProfileBioGearSection from '@/components/profile/ProfileBioGearSection';
import SiteErrorState from '@/components/layout/SiteErrorState';
import SiteLoadingState from '@/components/layout/SiteLoadingState';
import BragDetailModal from '@/components/ranking/BragDetailModal';
import type { RankingItem } from '@/components/RankingCard';

export default function ProfilePage({ params }: { params: Promise<{ nickname: string }> }) {
  const { nickname: rawNickname } = use(params);
  const nickname = decodeURIComponent(rawNickname);
  const [bragDetail, setBragDetail] = useState<RankingItem | null>(null);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['profile', nickname],
    queryFn: async () => {
      const res = await api.get(`/users/profile/${encodeURIComponent(nickname)}`);
      return res.data.data;
    },
    enabled: !!nickname,
  });

  if (isLoading) {
    return (
      <main className="site-container site-page-body profile-page-body">
        <SiteLoadingState icon="🎣" message="프로필 불러오는 중..." />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="site-container site-page-body profile-page-body">
        <SiteErrorState
          icon="😕"
          title="존재하지 않는 사용자입니다"
          description="닉네임을 확인하거나 다른 프로필을 찾아보세요."
          backHref="/community"
          backLabel="커뮤니티로"
          onRetry={() => refetch()}
          retryLabel="다시 시도"
        />
      </main>
    );
  }

  const { user, stats, featuredCatches, catches, personalCatches, posts, gears } = data;

  const openBragDetail = (catchItem: {
    id: string;
    imageUrl?: string;
    locationName?: string | null;
    createdAt: string;
    memo?: string | null;
    fishSpecies?: { id?: number; nameKo: string } | null;
    lengthCm?: unknown;
  }) => {
    setBragDetail({
      rank: 0,
      user: {
        id: user.id,
        nickname: user.nickname,
        profileImage: user.profileImage ?? undefined,
      },
      catch: {
        id: catchItem.id,
        imageUrl: catchItem.imageUrl ?? '',
        locationName: catchItem.locationName ?? undefined,
        createdAt: catchItem.createdAt,
        memo: catchItem.memo ?? null,
      },
      fishSpecies: catchItem.fishSpecies
        ? { id: catchItem.fishSpecies.id, nameKo: catchItem.fishSpecies.nameKo }
        : undefined,
      rankScore: 0,
      recordType: 'personal',
      verified: false,
    });
  };

  const isOwnProfile = currentUser?.id === user.id;

  return (
    <main>
      <ProfileHeader
        nickname={user.nickname}
        subtitle={`${new Date(user.createdAt).toLocaleDateString('ko-KR')} 가입`}
        badges={
          (user.activityRegion || user.fishingCategory) ? (
            <>
              {user.activityRegion && (
                <span className="profile-badge">📍 {formatActivityRegionLabel(user.activityRegion)}</span>
              )}
              {user.fishingCategory && (
                <span className="profile-badge">{formatFishingCategory(user.fishingCategory)}</span>
              )}
            </>
          ) : undefined
        }
      />

      <ProfileStatsBar
        items={[
          { value: stats.fishCount ?? 0, label: '인증 기록' },
          { value: stats.personalCount ?? 0, label: '자랑 기록' },
          { value: formatActivityRegionLabel(user.activityRegion), label: '주 활동 지역' },
          { value: stats.totalPosts ?? posts.length, label: '작성 글' },
        ]}
      />

      <ProfileBioGearSection bio={user.bio} gears={gears} />

      {featuredCatches?.length > 0 && (
        <div className="profile-public-featured">
          <div className="profile-public-featured-inner">
            <h2 className="profile-public-section-title">⭐ 대표 기록</h2>
            <div className="profile-featured-grid">
              {featuredCatches.map((c: {
                id: string;
                imageUrl?: string;
                fishSpecies?: { nameKo: string };
                lengthCm: unknown;
                locationName?: string;
                createdAt: string;
              }) => (
                <div key={c.id} className="profile-featured-card">
                  <div className="profile-featured-card-img">
                    {c.imageUrl ? (
                      <img src={getImageUrl(c.imageUrl)!} alt={c.fishSpecies?.nameKo ?? '어종'} />
                    ) : (
                      <div className="profile-featured-card-placeholder">🐟</div>
                    )}
                  </div>
                  <div className="profile-featured-card-body">
                    <div className="catch-record-badges">
                      {c.fishSpecies && (
                        <span className="catch-record-badge species">{c.fishSpecies.nameKo}</span>
                      )}
                    </div>
                    <div className="profile-featured-card-length">{formatLength(c.lengthCm as number)}</div>
                    <div className="catch-record-meta">
                      {c.locationName ? `📍 ${c.locationName}` : formatTimeAgo(c.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="profile-public-grid">
        <section>
          <h2 className="profile-public-section-title">✅ 인증 기록</h2>
          {catches.length > 0 ? (
            <div className="catch-record-list">
              {catches.map((c: {
                id: string;
                imageUrl?: string;
                fishSpecies?: { nameKo: string };
                certification?: { grade: string };
                locationName?: string;
                createdAt: string;
                lengthCm: unknown;
              }) => (
                <div key={c.id} className="catch-record-row">
                  <div className="catch-record-thumb">
                    {c.imageUrl ? (
                      <img src={getImageUrl(c.imageUrl)!} alt={c.fishSpecies?.nameKo ?? ''} />
                    ) : (
                      <span>🐟</span>
                    )}
                  </div>
                  <div className="catch-record-body">
                    <div className="catch-record-badges">
                      {c.fishSpecies && (
                        <span className="catch-record-badge species">{c.fishSpecies.nameKo}</span>
                      )}
                      {c.certification?.grade && (
                        <span className="catch-record-badge" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
                          인증 {c.certification.grade}
                        </span>
                      )}
                    </div>
                    <div className="catch-record-meta">
                      {c.locationName ? `📍 ${c.locationName}` : formatTimeAgo(c.createdAt)}
                    </div>
                  </div>
                  <div className="catch-record-length">{formatLength(c.lengthCm as number)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="profile-inline-empty">
              <div className="profile-inline-empty-icon">🎣</div>
              <p>아직 인증된 기록이 없습니다</p>
            </div>
          )}
        </section>

        <section>
          <h2 className="profile-public-section-title">📝 커뮤니티 글</h2>
          {posts.length > 0 ? (
            <div className="profile-post-list">
              {posts.map((p: {
                id: string;
                title: string;
                viewCount: number;
                createdAt: string;
                _count?: { comments: number };
              }) => (
                <div key={p.id} className="profile-post-row">
                  <Link href={`/community/${p.id}`} className="profile-post-link">
                    <div className="profile-post-title">{p.title}</div>
                    <div className="profile-post-meta">
                      <span>💬 댓글 {p._count?.comments ?? 0}</span>
                      <span>👁 {p.viewCount}</span>
                      <span>{formatTimeAgo(p.createdAt)}</span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="profile-inline-empty">
              <div className="profile-inline-empty-icon">📝</div>
              <p>작성한 글이 없습니다</p>
            </div>
          )}
        </section>
      </div>

      {personalCatches?.length > 0 && (
        <div className="profile-public-brag-section">
          <section>
            <h2 className="profile-public-section-title">📷 자랑 기록</h2>
            <div className="profile-public-brag-grid">
              {personalCatches.map((c: {
                id: string;
                imageUrl?: string;
                fishSpecies?: { nameKo: string };
                lengthCm?: unknown;
                locationName?: string;
                createdAt: string;
                memo?: string;
              }) => (
                <button
                  key={c.id}
                  type="button"
                  className="profile-brag-card"
                  onClick={() => openBragDetail(c)}
                >
                  <div className="profile-brag-card-img">
                    {c.imageUrl ? (
                      <img src={getImageUrl(c.imageUrl)!} alt={c.fishSpecies?.nameKo ?? ''} />
                    ) : (
                      <div className="profile-featured-card-placeholder">🐟</div>
                    )}
                  </div>
                  <div className="profile-brag-card-body">
                    {c.fishSpecies && (
                      <div className="profile-brag-card-species">{c.fishSpecies.nameKo}</div>
                    )}
                    {c.lengthCm != null && (
                      <div className="profile-brag-card-length">{formatLength(c.lengthCm as number)}</div>
                    )}
                    <div className="profile-brag-card-meta">
                      {c.locationName ? `📍 ${c.locationName}` : formatTimeAgo(c.createdAt)}
                    </div>
                    {c.memo && <div className="profile-brag-card-memo">{c.memo}</div>}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {bragDetail && (
        <BragDetailModal
          item={bragDetail}
          editable={isOwnProfile}
          onClose={() => setBragDetail(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['profile', nickname] });
            setBragDetail(null);
          }}
          onDeleted={() => {
            queryClient.invalidateQueries({ queryKey: ['profile', nickname] });
            queryClient.invalidateQueries({ queryKey: ['me'] });
            setBragDetail(null);
          }}
        />
      )}
    </main>
  );
}
