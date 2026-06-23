'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatTimeAgo, formatLength } from '@/lib/utils';
import { FISHING_CATEGORY_OPTIONS, formatFishingCategory, KOREAN_REGION_GROUPS, formatActivityRegionLabel, type FishingCategory } from '@/lib/profile';
import { formatActivityRegion, parseActivityRegion, getDistrictsByProvince } from '@/lib/korean-regions';
import { IS_BRAG_UPLOAD_ENABLED, IS_CERTIFIED_UPLOAD_ENABLED } from '@/lib/platform';
import { getImageUrl } from '@/lib/images';
import ProfileHeader, { ProfileStatsBar } from '@/components/layout/ProfileHeader';
import ProfileGearEditor from '@/components/profile/ProfileGearEditor';
import SiteEmptyState from '@/components/layout/SiteEmptyState';
import SiteLoadingState from '@/components/layout/SiteLoadingState';
import BragDetailModal from '@/components/ranking/BragDetailModal';
import type { RankingItem } from '@/components/RankingCard';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  approved: { label: '인증 완료', color: '#2e7d32', bg: '#e8f5e9' },
  pending: { label: '분석 중', color: '#e65100', bg: '#fff3e0' },
  rejected: { label: '재촬영 필요', color: '#c62828', bg: '#ffebee' },
};

type Tab = 'catches' | 'posts';
type CatchRecordTab = 'certified' | 'personal';

const PERSONAL_LABEL = { label: '자랑 기록', color: '#5c6bc0', bg: '#e8eaf6' };

export default function MyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoggedIn, authReady, user } = useAuthStore();
  const [bragDetail, setBragDetail] = useState<RankingItem | null>(null);
  const [tab, setTab] = useState<Tab>('catches');
  const [catchRecordTab, setCatchRecordTab] = useState<CatchRecordTab>('certified');
  const [activityProvince, setActivityProvince] = useState('');
  const [activityDistrict, setActivityDistrict] = useState('');
  const [fishingCategory, setFishingCategory] = useState<FishingCategory | ''>('');
  const [bio, setBio] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);

  useEffect(() => {
    if (authReady && !isLoggedIn) router.push('/auth/login');
  }, [authReady, isLoggedIn, router]);

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data.data,
    enabled: isLoggedIn,
  });

  useEffect(() => {
    if (meData) {
      const parsed = parseActivityRegion(meData.activityRegion);
      setActivityProvince(parsed?.province ?? '');
      setActivityDistrict(parsed?.district ?? '');
      setFishingCategory((meData.fishingCategory as FishingCategory) ?? '');
      setBio(meData.bio ?? '');
      setFeaturedIds(meData.featuredCatchIds ?? []);
    }
  }, [meData]);

  const featuredMutation = useMutation({
    mutationFn: async (catchIds: string[]) => {
      const res = await api.patch('/users/me/featured-catches', { catchIds });
      return res.data.data;
    },
    onSuccess: (_data, catchIds) => {
      setFeaturedIds(catchIds);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const toggleFeatured = (catchId: string, isApproved: boolean, recordType: string) => {
    if (!isApproved || recordType !== 'certified') return;
    if (featuredIds.includes(catchId)) {
      featuredMutation.mutate(featuredIds.filter((id) => id !== catchId));
    } else if (featuredIds.length < 3) {
      featuredMutation.mutate([...featuredIds, catchId]);
    }
  };

  const { data: catchesData, isLoading: catchesLoading } = useQuery({
    queryKey: ['my-catches', catchRecordTab],
    queryFn: async () => {
      const res = await api.get(`/catches/me?recordType=${catchRecordTab}&limit=30`);
      return res.data.data;
    },
    enabled: isLoggedIn,
  });

  const approvedCertified = catchRecordTab === 'certified'
    ? (catchesData?.items?.filter((c: { status: string }) => c.status === 'approved') ?? [])
    : [];
  const featuredCatches = approvedCertified
    .filter((c: { id: string }) => featuredIds.includes(c.id))
    .sort((a: { id: string }, b: { id: string }) => featuredIds.indexOf(a.id) - featuredIds.indexOf(b.id));

  const districtOptions = getDistrictsByProvince(activityProvince);

  const profileMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch('/users/me', {
        bio: bio.trim() || null,
        activityRegion: activityProvince && activityDistrict
          ? formatActivityRegion(activityProvince, activityDistrict)
          : null,
        fishingCategory: fishingCategory || null,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    },
  });

  if (!authReady || !isLoggedIn) return null;

  const openBragDetail = (item: {
    id: string;
    imageUrl?: string;
    locationName?: string | null;
    createdAt: string;
    memo?: string | null;
    fishSpecies?: { id?: number; nameKo: string } | null;
  }) => {
    setBragDetail({
      rank: 0,
      user: {
        id: user!.id,
        nickname: user!.nickname ?? '',
        profileImage: user?.profileImage,
      },
      catch: {
        id: item.id,
        imageUrl: item.imageUrl ?? '',
        locationName: item.locationName ?? undefined,
        createdAt: item.createdAt,
        memo: item.memo ?? null,
      },
      fishSpecies: item.fishSpecies
        ? { id: item.fishSpecies.id, nameKo: item.fishSpecies.nameKo }
        : undefined,
      rankScore: 0,
      recordType: 'personal',
      verified: false,
    });
  };

  const stats = meData?.stats;
  const posts = meData?.posts ?? [];
  const uploadEnabled = catchRecordTab === 'certified' ? IS_CERTIFIED_UPLOAD_ENABLED : IS_BRAG_UPLOAD_ENABLED;
  const uploadHref = catchRecordTab === 'certified' ? '/upload' : '/upload/personal';

  return (
    <main>
      <ProfileHeader
        nickname={user?.nickname ?? '?'}
        subtitle={user?.email}
        actions={
          user?.nickname ? (
            <Link href={`/profile/${encodeURIComponent(user.nickname)}`} className="profile-header-action">
              공개 프로필 보기
            </Link>
          ) : undefined
        }
      />

      {stats && (
        <ProfileStatsBar
          items={[
            { value: stats.fishCount ?? 0, label: '인증 기록' },
            { value: stats.personalCount ?? 0, label: '자랑 기록' },
            { value: formatFishingCategory(meData?.fishingCategory), label: '낚시 유형' },
            { value: stats.totalPosts ?? 0, label: '작성 글' },
          ]}
        />
      )}

      <div className="profile-section">
        <div className="site-container profile-section-inner profile-page-body">
          <h3 className="profile-section-title">프로필 설정</h3>
          <div style={{ marginBottom: 14 }}>
            <label className="profile-form-label">자기소개</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="낚시 스타일, 좋아하는 포인트 등 간단히 소개해 보세요."
              maxLength={500}
              rows={3}
              className="site-form-input"
              style={{ width: '100%', resize: 'vertical' }}
            />
            <div className="profile-char-count">{bio.length}/500</div>
          </div>
          <div className="profile-form-grid">
            <div>
              <label className="profile-form-label">주 활동 지역</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select
                  value={activityProvince}
                  onChange={(e) => {
                    setActivityProvince(e.target.value);
                    setActivityDistrict('');
                  }}
                  className="site-form-select"
                  style={{ color: activityProvince ? undefined : 'var(--text-muted)' }}
                >
                  <option value="">시·도 선택</option>
                  {KOREAN_REGION_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.provinces.map((p) => (
                        <option key={p.label} value={p.label}>{p.fullLabel}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <select
                  value={activityDistrict}
                  onChange={(e) => setActivityDistrict(e.target.value)}
                  disabled={!activityProvince}
                  className="site-form-select"
                >
                  <option value="">시·군·구 선택</option>
                  {districtOptions.map((d) => (
                    <option key={d.name} value={d.name}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="profile-form-label">낚시 유형</label>
              <div className="profile-category-group">
                {FISHING_CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFishingCategory(opt.value)}
                    className={`profile-category-btn${fishingCategory === opt.value ? ' active' : ''}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => profileMutation.mutate()}
            disabled={profileMutation.isPending}
            className="site-btn-sm"
          >
            {profileMutation.isPending ? '저장 중...' : profileSaved ? '저장됨 ✓' : '프로필 저장'}
          </button>
        </div>
      </div>

      <div className="profile-section">
        <div className="site-container profile-section-inner profile-page-body">
          <h3 className="profile-section-title">내 장비</h3>
          <ProfileGearEditor gears={meData?.gears ?? []} />
        </div>
      </div>

      <div className="site-tabs-bar">
        <div className="site-container site-tabs-inner profile-page-body">
          {([
            { key: 'catches' as Tab, label: '낚시 기록' },
            { key: 'posts' as Tab, label: '내가 쓴 글' },
          ]).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`site-tab${tab === t.key ? ' active' : ''}`}
            >
              {t.label}
              {t.key === 'posts' && stats?.totalPosts > 0 && (
                <span className="site-tab-badge">{stats.totalPosts}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="site-container site-page-body profile-page-body">
        {tab === 'catches' ? (
          <>
            <div className="record-type-tabs">
              {([
                { key: 'certified' as CatchRecordTab, label: '인증 기록', desc: '줄자 인증 · 랭킹 반영' },
                { key: 'personal' as CatchRecordTab, label: '자랑 기록', desc: '사진 · 추천 랭킹' },
              ]).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setCatchRecordTab(t.key)}
                  className={`record-type-tab${catchRecordTab === t.key ? ' active' : ''}`}
                >
                  <div className="record-type-tab-title">{t.label}</div>
                  <div className="record-type-tab-desc">{t.desc}</div>
                </button>
              ))}
            </div>

            {catchRecordTab === 'certified' && (
              <div className="profile-featured-panel">
                <div className="profile-featured-head">
                  <div>
                    <h2 className="profile-featured-title">⭐ 대표 기록</h2>
                    <p className="profile-featured-desc">프로필 상단에 보여줄 기록을 최대 3개 선택하세요</p>
                  </div>
                  <span className="profile-featured-count">{featuredIds.length}/3</span>
                </div>
                {featuredCatches.length > 0 ? (
                  <div className="profile-featured-grid">
                    {featuredCatches.map((item: {
                      id: string;
                      imageUrl?: string;
                      fishSpecies?: { nameKo: string };
                      lengthCm: unknown;
                    }) => (
                      <div key={item.id} className="profile-featured-card">
                        <div className="profile-featured-card-img">
                          {item.imageUrl ? (
                            <img src={getImageUrl(item.imageUrl)!} alt={item.fishSpecies?.nameKo ?? ''} />
                          ) : (
                            <div className="profile-featured-card-placeholder">🐟</div>
                          )}
                        </div>
                        <div className="profile-featured-card-body">
                          <div className="profile-featured-card-species">{item.fishSpecies?.nameKo ?? '어종'}</div>
                          <div className="profile-featured-card-length">{formatLength(item.lengthCm as number)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="profile-inline-empty">
                    <p>아래 기록에서 ⭐ 버튼을 눌러 대표 기록을 설정하세요</p>
                  </div>
                )}
              </div>
            )}

            <div className="profile-list-head">
              <h2 className="profile-list-title">
                {catchRecordTab === 'certified' ? '인증 기록 목록' : '자랑 기록 목록'}
              </h2>
              {uploadEnabled && (
                <Link
                  href={uploadHref}
                  className={`profile-upload-link ${catchRecordTab === 'certified' ? 'certified' : 'brag'}`}
                >
                  {catchRecordTab === 'certified' ? '+ 인증 기록' : '+ 자랑 기록'}
                </Link>
              )}
            </div>

            {catchesLoading ? (
              <SiteLoadingState icon="🎣" message="기록 불러오는 중..." compact />
            ) : catchesData?.items?.length > 0 ? (
              <div className="catch-record-list">
                {catchesData.items.map((item: {
                  id: string;
                  recordType: string;
                  status: string;
                  imageUrl?: string;
                  fishSpecies?: { nameKo: string };
                  locationName?: string;
                  createdAt: string;
                  memo?: string;
                  lengthCm: unknown;
                  certification?: { grade: string };
                }) => {
                  const statusInfo = item.recordType === 'personal'
                    ? PERSONAL_LABEL
                    : (STATUS_LABELS[item.status] ?? STATUS_LABELS.pending);
                  const isFeatured = featuredIds.includes(item.id);
                  const canPin = item.status === 'approved' && item.recordType === 'certified';
                  const isPersonal = item.recordType === 'personal';

                  return (
                    <div
                      key={item.id}
                      role={isPersonal ? 'button' : undefined}
                      tabIndex={isPersonal ? 0 : undefined}
                      onClick={() => { if (isPersonal) openBragDetail(item); }}
                      onKeyDown={(event) => {
                        if (isPersonal && (event.key === 'Enter' || event.key === ' ')) {
                          event.preventDefault();
                          openBragDetail(item);
                        }
                      }}
                      className={`catch-record-row${isFeatured ? ' featured' : ''}${isPersonal ? ' clickable' : ''}`}
                    >
                      <div className="catch-record-thumb">
                        {item.imageUrl ? (
                          <img src={getImageUrl(item.imageUrl)!} alt={item.fishSpecies?.nameKo ?? ''} />
                        ) : (
                          <span>🐟</span>
                        )}
                      </div>
                      <div className="catch-record-body">
                        <div className="catch-record-badges">
                          {item.fishSpecies && (
                            <span className="catch-record-badge species">{item.fishSpecies.nameKo}</span>
                          )}
                          <span className="catch-record-badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                            {statusInfo.label}
                            {item.certification?.grade ? ` ${item.certification.grade}` : ''}
                          </span>
                        </div>
                        <div className="catch-record-meta">
                          {item.locationName && `📍 ${item.locationName} · `}
                          {formatTimeAgo(item.createdAt)}
                        </div>
                        {isPersonal && item.memo && (
                          <div className="catch-record-memo">{item.memo}</div>
                        )}
                      </div>
                      {isPersonal ? (
                        <div className="catch-record-actions">
                          <button
                            type="button"
                            className="catch-record-action-btn edit"
                            onClick={(event) => {
                              event.stopPropagation();
                              openBragDetail(item);
                            }}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            className="catch-record-action-btn delete"
                            onClick={async (event) => {
                              event.stopPropagation();
                              if (!window.confirm('이 자랑 기록을 삭제할까요?')) return;
                              try {
                                await api.delete(`/catches/${item.id}/personal`);
                                queryClient.invalidateQueries({ queryKey: ['my-catches'] });
                                queryClient.invalidateQueries({ queryKey: ['me'] });
                                queryClient.invalidateQueries({ queryKey: ['rankings'] });
                              } catch {
                                window.alert('삭제에 실패했습니다.');
                              }
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      ) : (
                        <div className="catch-record-length">{formatLength(item.lengthCm as number)}</div>
                      )}
                      {canPin && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleFeatured(item.id, item.status === 'approved', item.recordType);
                          }}
                          disabled={featuredMutation.isPending || (!isFeatured && featuredIds.length >= 3)}
                          title={isFeatured ? '대표 기록 해제' : '대표 기록으로 설정'}
                          className={`catch-record-pin${isFeatured ? ' featured' : ''}`}
                        >
                          {isFeatured ? '⭐' : '☆'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <SiteEmptyState
                icon="🐟"
                title={catchRecordTab === 'certified' ? '아직 인증 기록이 없습니다' : '아직 자랑 기록이 없습니다'}
                description={
                  catchRecordTab === 'certified'
                    ? '줄자와 함께 촬영한 사진으로 첫 인증 기록을 남겨 보세요.'
                    : '사진으로 자랑 기록을 남기고 추천 랭킹에 참여해 보세요.'
                }
                action={
                  uploadEnabled ? (
                    <Link href={uploadHref} className="site-btn site-btn-primary">
                      {catchRecordTab === 'certified' ? '첫 인증 기록 올리기' : '첫 자랑 기록 올리기'}
                    </Link>
                  ) : undefined
                }
              />
            )}
          </>
        ) : (
          <>
            <div className="profile-list-head">
              <h2 className="profile-list-title">내가 쓴 글</h2>
              <Link href="/community/write" className="profile-upload-link certified">
                + 글쓰기
              </Link>
            </div>

            {posts.length > 0 ? (
              <div className="profile-post-list">
                {posts.map((p: {
                  id: string;
                  title: string;
                  createdAt: string;
                  viewCount: number;
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
                    <Link href={`/community/${p.id}/edit`} className="catch-record-action-btn edit" style={{ textDecoration: 'none' }}>
                      수정
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <SiteEmptyState
                icon="📝"
                title="아직 작성한 글이 없습니다"
                actionHref="/community/write"
                actionLabel="첫 글 작성하기"
              />
            )}
          </>
        )}
      </div>

      {bragDetail && (
        <BragDetailModal
          item={bragDetail}
          editable
          onClose={() => setBragDetail(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['my-catches'] });
            setBragDetail(null);
          }}
          onDeleted={() => {
            queryClient.invalidateQueries({ queryKey: ['my-catches'] });
            queryClient.invalidateQueries({ queryKey: ['me'] });
            setBragDetail(null);
          }}
        />
      )}
    </main>
  );
}
