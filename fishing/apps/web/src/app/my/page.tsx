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
import { UploadDisabledInline } from '@/components/UploadDisabledNotice';
import ProfileHeader, { ProfileStatsBar } from '@/components/layout/ProfileHeader';
import ProfileGearEditor from '@/components/profile/ProfileGearEditor';
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
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data.data;
    },
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
    ? (catchesData?.items?.filter((c: any) => c.status === 'approved') ?? [])
    : [];
  const featuredCatches = approvedCertified.filter((c: any) => featuredIds.includes(c.id))
    .sort((a: any, b: any) => featuredIds.indexOf(a.id) - featuredIds.indexOf(b.id));

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

  const openBragDetail = (item: any) => {
    setBragDetail({
      rank: 0,
      user: {
        id: user!.id,
        nickname: user!.nickname ?? '',
        profileImage: user?.profileImage,
      },
      catch: {
        id: item.id,
        imageUrl: item.imageUrl,
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
  const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';

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
        <div className="site-container profile-section-inner" style={{ maxWidth: 900 }}>
          <h3 className="profile-section-title">프로필 설정</h3>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#546e7a', marginBottom: '6px' }}>자기소개</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="낚시 스타일, 좋아하는 포인트 등 간단히 소개해 보세요."
              maxLength={500}
              rows={3}
              className="site-form-input"
              style={{ width: '100%', resize: 'vertical' }}
            />
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#90a4ae', marginTop: '4px' }}>{bio.length}/500</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#546e7a', marginBottom: '6px' }}>주 활동 지역</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                  style={{
                    background: activityProvince ? '#fff' : 'var(--surface-muted)',
                    color: activityDistrict ? undefined : 'var(--text-muted)',
                    cursor: activityProvince ? 'pointer' : 'not-allowed',
                  }}
                >
                  <option value="">시·군·구 선택</option>
                  {districtOptions.map((d) => (
                    <option key={d.name} value={d.name}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#546e7a', marginBottom: '6px' }}>낚시 유형</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {FISHING_CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFishingCategory(opt.value)}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: '6px', cursor: 'pointer',
                      fontSize: '13px', fontWeight: fishingCategory === opt.value ? 700 : 400,
                      border: fishingCategory === opt.value ? '2px solid #1565c0' : '1px solid #dde3ea',
                      background: fishingCategory === opt.value ? '#e3f2fd' : '#fff',
                      color: fishingCategory === opt.value ? '#1565c0' : '#546e7a',
                    }}
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
        <div className="site-container profile-section-inner" style={{ maxWidth: 900 }}>
          <h3 className="profile-section-title">내 장비</h3>
          <ProfileGearEditor gears={meData?.gears ?? []} />
        </div>
      </div>

      <div className="site-tabs-bar">
        <div className="site-container site-tabs-inner" style={{ maxWidth: 900 }}>
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

      <div className="site-container site-page-body" style={{ maxWidth: 900 }}>
        {tab === 'catches' ? (
          <>
            {/* 기록 유형 서브탭 */}
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
            <div style={{ marginBottom: '24px', background: '#fff', border: '1px solid #dde3ea', borderRadius: '10px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '16px' }}>⭐ 대표 기록</h2>
                  <p style={{ margin: 0, fontSize: '12px', color: '#546e7a' }}>프로필 상단에 보여줄 기록을 최대 3개 선택하세요</p>
                </div>
                <span style={{ fontSize: '12px', color: '#1565c0', fontWeight: 700 }}>{featuredIds.length}/3</span>
              </div>
              {featuredCatches.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {featuredCatches.map((item: any) => (
                    <div key={item.id} style={{ border: '2px solid #1565c0', borderRadius: '8px', overflow: 'hidden', background: '#f8fbff' }}>
                      <div style={{ height: '100px', background: '#e3f2fd' }}>
                        {item.imageUrl ? (
                          <img src={`${API_BASE}${item.imageUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🐟</div>
                        )}
                      </div>
                      <div style={{ padding: '10px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0b1f3a' }}>{item.fishSpecies?.nameKo ?? '어종'}</div>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: '#1565c0' }}>{formatLength(item.lengthCm)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#90a4ae', fontSize: '13px' }}>
                  아래 기록에서 ⭐ 버튼을 눌러 대표 기록을 설정하세요
                </div>
              )}
            </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '16px' }}>
                {catchRecordTab === 'certified' ? '인증 기록 목록' : '자랑 기록 목록'}
              </h2>
              {(catchRecordTab === 'certified' ? IS_CERTIFIED_UPLOAD_ENABLED : IS_BRAG_UPLOAD_ENABLED) ? (
                <Link href={catchRecordTab === 'certified' ? '/upload' : '/upload/personal'} style={{
                  background: catchRecordTab === 'certified' ? '#1976d2' : '#5c6bc0',
                  color: '#fff', borderRadius: '5px',
                  padding: '8px 16px', fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                }}>
                  {catchRecordTab === 'certified' ? '+ 인증 기록' : '+ 자랑 기록'}
                </Link>
              ) : (
                <span style={{
                  background: '#eceff1', color: '#90a4ae', borderRadius: '5px',
                  padding: '8px 16px', fontSize: '13px', fontWeight: 700,
                }}>
                  📱 앱 전용
                </span>
              )}
            </div>

            {catchesLoading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#546e7a' }}>🎣 기록 불러오는 중...</div>
            ) : catchesData?.items?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {catchesData.items.map((item: any) => {
                  const statusInfo = item.recordType === 'personal'
                    ? PERSONAL_LABEL
                    : (STATUS_LABELS[item.status] ?? STATUS_LABELS.pending);
                  const isFeatured = featuredIds.includes(item.id);
                  const canPin = item.status === 'approved' && item.recordType === 'certified';
                  return (
                    <div
                      key={item.id}
                      role={item.recordType === 'personal' ? 'button' : undefined}
                      tabIndex={item.recordType === 'personal' ? 0 : undefined}
                      onClick={() => {
                        if (item.recordType === 'personal') openBragDetail(item);
                      }}
                      onKeyDown={(event) => {
                        if (item.recordType === 'personal' && (event.key === 'Enter' || event.key === ' ')) {
                          event.preventDefault();
                          openBragDetail(item);
                        }
                      }}
                      style={{
                        background: '#fff', border: `1px solid ${isFeatured ? '#1565c0' : '#dde3ea'}`, borderRadius: '8px',
                        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px',
                        cursor: item.recordType === 'personal' ? 'pointer' : 'default',
                      }}
                    >
                      <div style={{
                        width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden',
                        flexShrink: 0, background: '#e3f2fd',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {item.imageUrl ? (
                          <img src={`${API_BASE}${item.imageUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '24px' }}>🐟</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          {item.fishSpecies && (
                            <span style={{ background: '#e3f2fd', color: '#0d47a1', fontSize: '10px', fontWeight: 500, borderRadius: '3px', padding: '2px 7px' }}>
                              {item.fishSpecies.nameKo}
                            </span>
                          )}
                          <span style={{ background: statusInfo.bg, color: statusInfo.color, fontSize: '10px', fontWeight: 500, borderRadius: '3px', padding: '2px 7px' }}>
                            {statusInfo.label}
                            {item.certification?.grade ? ` ${item.certification.grade}` : ''}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#546e7a' }}>
                          {item.locationName && `📍 ${item.locationName} · `}
                          {formatTimeAgo(item.createdAt)}
                        </div>
                        {item.recordType === 'personal' && item.memo && (
                          <div style={{ fontSize: '12px', color: '#5c6bc0', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.memo}
                          </div>
                        )}
                      </div>
                      {item.recordType === 'personal' ? (
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openBragDetail(item);
                            }}
                            style={{
                              padding: '6px 12px',
                              border: '1px solid #c5cae9',
                              borderRadius: '6px',
                              background: '#f3f4ff',
                              color: '#3949ab',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            수정
                          </button>
                          <button
                            type="button"
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
                            style={{
                              padding: '6px 12px',
                              border: '1px solid #ef9a9a',
                              borderRadius: '6px',
                              background: '#ffebee',
                              color: '#c62828',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      ) : (
                      <div style={{ fontSize: '20px', fontWeight: 900, color: '#0b1f3a', letterSpacing: '-0.5px', flexShrink: 0 }}>
                        {formatLength(item.lengthCm)}
                      </div>
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
                          style={{
                            background: isFeatured ? '#fff8e1' : '#f0f4f8',
                            border: `1px solid ${isFeatured ? '#ffb300' : '#dde3ea'}`,
                            borderRadius: '6px', width: '36px', height: '36px', cursor: 'pointer',
                            fontSize: '16px', flexShrink: 0,
                            opacity: !isFeatured && featuredIds.length >= 3 ? 0.4 : 1,
                          }}
                        >
                          {isFeatured ? '⭐' : '☆'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '8px', border: '1px solid #dde3ea' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🐟</div>
                <p style={{ color: '#546e7a', marginBottom: '16px' }}>
                  {catchRecordTab === 'certified' ? '아직 인증 기록이 없습니다' : '아직 자랑 기록이 없습니다'}
                </p>
                {(catchRecordTab === 'certified' ? IS_CERTIFIED_UPLOAD_ENABLED : IS_BRAG_UPLOAD_ENABLED) ? (
                  <Link href={catchRecordTab === 'certified' ? '/upload' : '/upload/personal'} style={{
                    background: catchRecordTab === 'certified' ? '#1976d2' : '#5c6bc0',
                    color: '#fff', borderRadius: '5px',
                    padding: '10px 22px', fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                  }}>
                    {catchRecordTab === 'certified' ? '첫 인증 기록 올리기' : '첫 자랑 기록 올리기'}
                  </Link>
                ) : (
                  <div style={{ maxWidth: '320px', margin: '0 auto' }}>
                    <UploadDisabledInline />
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '16px' }}>내가 쓴 글</h2>
              <Link href="/community/write" style={{
                background: '#1976d2', color: '#fff', borderRadius: '5px',
                padding: '8px 16px', fontSize: '13px', fontWeight: 700, textDecoration: 'none',
              }}>
                + 글쓰기
              </Link>
            </div>

            {posts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {posts.map((p: any) => (
                  <div
                    key={p.id}
                    style={{
                      background: '#fff', border: '1px solid #dde3ea', borderRadius: '8px',
                      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
                    }}
                  >
                    <Link href={`/community/${p.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a2332', marginBottom: '6px' }}>
                        {p.title}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#90a4ae' }}>
                        <span>💬 댓글 {p._count?.comments ?? 0}</span>
                        <span>👁 {p.viewCount}</span>
                        <span>{formatTimeAgo(p.createdAt)}</span>
                      </div>
                    </Link>
                    <Link
                      href={`/community/${p.id}/edit`}
                      style={{
                        flexShrink: 0,
                        padding: '6px 12px',
                        border: '1px solid #c5cae9',
                        borderRadius: '6px',
                        background: '#f3f4ff',
                        color: '#3949ab',
                        fontSize: '12px',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      수정
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '8px', border: '1px solid #dde3ea' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
                <p style={{ color: '#546e7a', marginBottom: '16px' }}>아직 작성한 글이 없습니다</p>
                <Link href="/community/write" style={{
                  background: '#1976d2', color: '#fff', borderRadius: '5px',
                  padding: '10px 22px', fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                }}>
                  첫 글 작성하기
                </Link>
              </div>
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
