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
import BragDetailModal from '@/components/ranking/BragDetailModal';
import type { RankingItem } from '@/components/RankingCard';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';

export default function ProfilePage({ params }: { params: Promise<{ nickname: string }> }) {
  const { nickname: rawNickname } = use(params);
  const nickname = decodeURIComponent(rawNickname);
  const [bragDetail, setBragDetail] = useState<RankingItem | null>(null);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['profile', nickname],
    queryFn: async () => {
      const res = await api.get(`/users/profile/${encodeURIComponent(nickname)}`);
      return res.data.data;
    },
    enabled: !!nickname,
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: '#546e7a' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎣</div>
        <p>프로필 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '80px' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>😕</div>
        <p style={{ color: '#546e7a' }}>존재하지 않는 사용자입니다.</p>
        <Link href="/" style={{ color: '#1565c0', textDecoration: 'none' }}>홈으로 돌아가기</Link>
      </div>
    );
  }

  const { user, stats, featuredCatches, catches, personalCatches, posts, gears } = data;

  const openBragDetail = (catchItem: {
    id: string;
    imageUrl: string;
    locationName?: string | null;
    createdAt: string;
    memo?: string | null;
    fishSpecies?: { id?: number; nameKo: string } | null;
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
        imageUrl: catchItem.imageUrl,
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

      {/* 대표 기록 */}
      {featuredCatches?.length > 0 && (
        <div style={{ background: '#fff', borderBottom: '1px solid #dde3ea', padding: '24px 28px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: '16px' }}>⭐ 대표 기록</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {featuredCatches.map((c: any) => (
                <div key={c.id} style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #dde3ea', background: '#fff' }}>
                  <div style={{ height: '140px', background: '#e3f2fd' }}>
                    {c.imageUrl ? (
                      <img src={getImageUrl(c.imageUrl)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🐟</div>
                    )}
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                      {c.fishSpecies && (
                        <span style={{ background: '#e3f2fd', color: '#0d47a1', fontSize: '10px', fontWeight: 500, borderRadius: '3px', padding: '2px 7px' }}>
                          {c.fishSpecies.nameKo}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#0b1f3a' }}>{formatLength(c.lengthCm)}</div>
                    <div style={{ fontSize: '12px', color: '#90a4ae', marginTop: '4px' }}>
                      {c.locationName ? `📍 ${c.locationName}` : formatTimeAgo(c.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>

        {/* 인증 기록 */}
        <section>
          <h2 style={{ margin: '0 0 14px', fontSize: '16px' }}>✅ 인증 기록</h2>
          {catches.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {catches.map((c: any) => (
                <div key={c.id} style={{
                  background: '#fff', border: '1px solid #dde3ea', borderRadius: '8px',
                  padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '6px', overflow: 'hidden',
                    background: '#e3f2fd', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {c.imageUrl ? (
                      <img src={`${API_BASE}${c.imageUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : <span style={{ fontSize: '20px' }}>🐟</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '3px' }}>
                      {c.fishSpecies && (
                        <span style={{ background: '#e3f2fd', color: '#0d47a1', fontSize: '10px', fontWeight: 500, borderRadius: '3px', padding: '2px 7px' }}>
                          {c.fishSpecies.nameKo}
                        </span>
                      )}
                      {c.certification?.grade && (
                        <span style={{ background: '#e8f5e9', color: '#2e7d32', fontSize: '10px', fontWeight: 500, borderRadius: '3px', padding: '2px 7px' }}>
                          인증 {c.certification.grade}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#546e7a' }}>
                      {c.locationName ? `📍 ${c.locationName}` : formatTimeAgo(c.createdAt)}
                    </div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#0b1f3a', letterSpacing: '-0.5px', flexShrink: 0 }}>
                    {formatLength(c.lengthCm)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #dde3ea', borderRadius: '8px', padding: '32px', textAlign: 'center', color: '#90a4ae' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎣</div>
              <p style={{ margin: 0, fontSize: '13px' }}>아직 인증된 기록이 없습니다</p>
            </div>
          )}
        </section>

        {/* 커뮤니티 글 */}
        <section>
          <h2 style={{ margin: '0 0 14px', fontSize: '16px' }}>📝 커뮤니티 글</h2>
          {posts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {posts.map((p: any) => (
                <Link key={p.id} href={`/community/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: '#fff', border: '1px solid #dde3ea', borderRadius: '8px',
                    padding: '12px 14px', cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a2332', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.title}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#90a4ae' }}>
                      <span>💬 댓글 {p._count?.comments ?? 0}</span>
                      <span>👁 {p.viewCount}</span>
                      <span>{formatTimeAgo(p.createdAt)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #dde3ea', borderRadius: '8px', padding: '32px', textAlign: 'center', color: '#90a4ae' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
              <p style={{ margin: 0, fontSize: '13px' }}>작성한 글이 없습니다</p>
            </div>
          )}
        </section>
      </div>

      {/* 자랑 기록 (전체 너비) */}
      {personalCatches?.length > 0 && (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 28px 28px' }}>
          <section>
            <h2 style={{ margin: '0 0 14px', fontSize: '16px' }}>📷 자랑 기록</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {personalCatches.map((c: any) => (
                <button
                  key={c.id}
                  type="button"
                  className="profile-brag-card"
                  onClick={() => openBragDetail(c)}
                >
                  <div style={{ height: '120px', background: '#e8eaf6' }}>
                    {c.imageUrl ? (
                      <img src={getImageUrl(c.imageUrl)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🐟</div>
                    )}
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    {c.fishSpecies && (
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#5c6bc0', marginBottom: '4px' }}>{c.fishSpecies.nameKo}</div>
                    )}
                    {c.lengthCm && (
                      <div style={{ fontSize: '16px', fontWeight: 900, color: '#0b1f3a' }}>{formatLength(c.lengthCm)}</div>
                    )}
                    <div style={{ fontSize: '11px', color: '#90a4ae', marginTop: '4px' }}>
                      {c.locationName ? `📍 ${c.locationName}` : formatTimeAgo(c.createdAt)}
                    </div>
                    {c.memo && (
                      <div className="profile-brag-card-memo">{c.memo}</div>
                    )}
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
