'use client';

import { use, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/images';
import PageHeader from '@/components/layout/PageHeader';
import PageBackLink from '@/components/layout/PageBackLink';
import { useAuthStore } from '@/store/auth.store';
import EncyclopediaEditLogModal from '@/components/encyclopedia/EncyclopediaEditLogModal';
import EncyclopediaEditLogTrigger from '@/components/encyclopedia/EncyclopediaEditLogTrigger';

type CommunityTip = {
  id: string;
  userId: string;
  nickname: string;
  season: string | null;
  bait: string | null;
  technique: string | null;
  habitat: string | null;
  note: string | null;
  summary: string | null;
  imageUrl: string | null;
  createdAt: string;
};

type NewsArticle = {
  title: string;
  link: string;
  pubDate: string | null;
  source: string | null;
};

type FilledFlags = {
  imageUrl: boolean;
  season: boolean;
  bait: boolean;
  technique: boolean;
  habitat: boolean;
  summary: boolean;
};

type EditLogChange = {
  field: string;
  label: string;
  oldValue: string | null;
  newValue: string | null;
};

type EditLog = {
  id: string;
  userId: string;
  nickname: string;
  changes: EditLogChange[];
  createdAt: string;
};

type FishDetail = {
  speciesId: number;
  nameKo: string;
  scientificName: string | null;
  category: string;
  imageUrl: string | null;
  imageAttribution: string | null;
  season: string | null;
  bait: string | null;
  technique: string | null;
  habitat: string | null;
  minSizeLaw: number | null;
  avgLengthCm: number | null;
  summary: string | null;
  distribution: string | null;
  communityTips: CommunityTip[];
  editLogs: EditLog[];
  filledByCommunity: FilledFlags;
  needsFill: FilledFlags;
  dataSource: string;
};

const PRACTICAL_FIELDS = [
  { key: 'season' as const, label: '시즌', icon: '📅' },
  { key: 'bait' as const, label: '미끼', icon: '🪱' },
  { key: 'technique' as const, label: '기법', icon: '🎣' },
  { key: 'habitat' as const, label: '포인트', icon: '📍' },
];

function CommunityBadge() {
  return <span className="encyclopedia-community-badge">낚시인 제공</span>;
}

export default function EncyclopediaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoggedIn } = useAuthStore();

  const [season, setSeason] = useState('');
  const [bait, setBait] = useState('');
  const [technique, setTechnique] = useState('');
  const [habitat, setHabitat] = useState('');
  const [summary, setSummary] = useState('');
  const [note, setNote] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditLogs, setShowEditLogs] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['encyclopedia-detail', id],
    queryFn: async () => {
      const res = await api.get(`/encyclopedia/${id}/detail`);
      return res.data.data as FishDetail;
    },
    staleTime: 60_000,
  });

  const fillFormFromData = useCallback(() => {
    if (!data) return;
    setSeason(data.season ?? '');
    setBait(data.bait ?? '');
    setTechnique(data.technique ?? '');
    setHabitat(data.habitat ?? '');
    setSummary(data.summary ?? '');
    setNote('');
    setImageFile(null);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [data]);

  const { data: articles, isLoading: articlesLoading } = useQuery({
    queryKey: ['encyclopedia-articles', id],
    queryFn: async () => {
      const res = await api.get(`/encyclopedia/${id}/news`);
      return res.data.data as NewsArticle[];
    },
    staleTime: 15 * 60_000,
  });

  const submitTip = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('season', season.trim());
      formData.append('bait', bait.trim());
      formData.append('technique', technique.trim());
      formData.append('habitat', habitat.trim());
      formData.append('summary', summary.trim());
      if (note.trim()) formData.append('note', note.trim());
      if (imageFile) formData.append('image', imageFile);

      await api.post(`/encyclopedia/${id}/tips`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      setShowForm(false);
      setSubmitError('');
      queryClient.invalidateQueries({ queryKey: ['encyclopedia-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['encyclopedia'] });
    },
    onError: (err: any) => {
      setSubmitError(err?.response?.data?.message ?? '저장에 실패했습니다.');
    },
  });

  if (isLoading || !data) {
    return (
      <main>
        <div className="site-container site-page-body site-empty">
          <div className="site-empty-icon">🐟</div>
          <p>불러오는 중...</p>
        </div>
      </main>
    );
  }

  const heroClass = data.category === 'saltwater' ? 'saltwater' : 'freshwater';
  const heroImage = getImageUrl(data.imageUrl);
  const hasDetailFields =
    PRACTICAL_FIELDS.some((f) => data[f.key]) || !!data.distribution || !!data.avgLengthCm;
  const needsAnyFill = Object.values(data.needsFill).some(Boolean);
  const missingLabels = [
    data.needsFill.imageUrl && '사진',
    data.needsFill.summary && '소개',
    data.needsFill.season && '시즌',
    data.needsFill.bait && '미끼',
    data.needsFill.technique && '기법',
    data.needsFill.habitat && '포인트',
  ].filter(Boolean) as string[];

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const openEditForm = () => {
    if (!isLoggedIn) {
      router.push('/auth/login');
      return;
    }
    if (!showForm) fillFormFromData();
    setShowForm((v) => !v);
    setSubmitError('');
  };

  const editLogCount = data.editLogs?.length ?? 0;

  const editFormButton = isLoggedIn ? (
    <button type="button" className="site-btn-sm site-btn-primary" onClick={openEditForm}>
      {showForm ? '닫기' : '정보 수정'}
    </button>
  ) : null;

  return (
    <main>
      <PageHeader title={data.nameKo} description={data.category === 'saltwater' ? '바다낚시' : '민물낚시'} />

      <div className="site-container site-page-body page-narrow">
        <PageBackLink href="/encyclopedia" label="어종 목록" />

        <div className={`encyclopedia-detail-cover ${heroClass}`}>
          {heroImage ? (
            <img src={heroImage} alt={data.nameKo} className="encyclopedia-detail-cover-img" />
          ) : (
            <div className="encyclopedia-detail-cover-placeholder">
              {data.category === 'saltwater' ? '🐠' : '🐟'}
            </div>
          )}
          <div className="encyclopedia-detail-cover-overlay">
            <h1 className="encyclopedia-detail-cover-title">{data.nameKo}</h1>
            {data.scientificName && (
              <p className="encyclopedia-detail-cover-sci">{data.scientificName}</p>
            )}
            {data.filledByCommunity.imageUrl && <CommunityBadge />}
          </div>
        </div>

        {needsAnyFill && (
          <div className="encyclopedia-needs-fill-banner">
            <span className="encyclopedia-needs-fill-icon">✏️</span>
            <div className="encyclopedia-needs-fill-body">
              <div className="encyclopedia-needs-fill-head">
                <div className="encyclopedia-needs-fill-title">기본 정보가 아직 부족해요</div>
                {!showForm && (
                  <div className="encyclopedia-section-actions">
                    <EncyclopediaEditLogTrigger
                      count={editLogCount}
                      onClick={() => setShowEditLogs(true)}
                    />
                    {editFormButton}
                  </div>
                )}
              </div>
              <p className="encyclopedia-needs-fill-desc">
                {missingLabels.join(' · ')}을(를) 알고 계시면 채워 주세요.
              </p>
            </div>
          </div>
        )}

        {data.minSizeLaw && (
          <div className="encyclopedia-law-banner">
            <span style={{ fontSize: 20 }}>⚖️</span>
            <div>
              <div className="info-tip-card-title" style={{ color: '#e65100' }}>
                방류 기준
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#bf360c' }}>
                {data.minSizeLaw}cm 미만은 방생
              </div>
            </div>
          </div>
        )}

        <section className="encyclopedia-practical-section">
          <div className="encyclopedia-section-head">
            <h2 className="encyclopedia-section-title">기본 정보</h2>
            <div className="encyclopedia-section-actions">
              <EncyclopediaEditLogTrigger
                count={editLogCount}
                onClick={() => setShowEditLogs(true)}
              />
              {editFormButton}
            </div>
          </div>
          {data.summary && (
            <div className="encyclopedia-practical-summary-wrap">
              {data.filledByCommunity.summary && <CommunityBadge />}
              <p className="encyclopedia-practical-summary">{data.summary}</p>
            </div>
          )}
          {hasDetailFields && (
            <div className="encyclopedia-practical-grid">
              {PRACTICAL_FIELDS.map((field) =>
                data[field.key] ? (
                  <div key={field.key} className="encyclopedia-practical-item">
                    <span className="encyclopedia-practical-icon">{field.icon}</span>
                    <div>
                      <div className="encyclopedia-practical-label">
                        {field.label}
                        {data.filledByCommunity[field.key] && <CommunityBadge />}
                      </div>
                      <div className="encyclopedia-practical-value">{data[field.key]}</div>
                    </div>
                  </div>
                ) : null,
              )}
              {data.distribution && data.distribution !== data.habitat && (
                <div className="encyclopedia-practical-item">
                  <span className="encyclopedia-practical-icon">🗺</span>
                  <div>
                    <div className="encyclopedia-practical-label">분포</div>
                    <div className="encyclopedia-practical-value">{data.distribution}</div>
                  </div>
                </div>
              )}
              {data.avgLengthCm && (
                <div className="encyclopedia-practical-item">
                  <span className="encyclopedia-practical-icon">📏</span>
                  <div>
                    <div className="encyclopedia-practical-label">크기</div>
                    <div className="encyclopedia-practical-value">평균 {data.avgLengthCm}cm</div>
                  </div>
                </div>
              )}
            </div>
          )}
          <p className="encyclopedia-practical-note post-meta-muted">
            로그인한 낚시인이 사진·정보를 수정할 수 있어요.
          </p>
        </section>

        {showForm && (
        <section className="encyclopedia-tips-section">
          <div className="encyclopedia-section-head">
            <h2 className="encyclopedia-section-title">정보 수정</h2>
          </div>

          <form
              className="encyclopedia-tip-form"
              onSubmit={(e) => {
                e.preventDefault();
                submitTip.mutate();
              }}
            >
              <p className="encyclopedia-tip-form-hint post-meta-muted">
                현재 표시 중인 정보가 폼에 채워져 있어요. 바꿀 항목만 고치고 저장하면 됩니다.
              </p>
              <label className="encyclopedia-tip-image-field">
                <span className="encyclopedia-tip-image-label">대표 사진</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                />
                {imagePreview && (
                  <div className="encyclopedia-tip-image-preview">
                    <img src={imagePreview} alt="미리보기" />
                    <button
                      type="button"
                      className="encyclopedia-tip-image-remove"
                      onClick={() => handleImageChange(null)}
                    >
                      제거
                    </button>
                  </div>
                )}
              </label>
              <textarea
                className="site-search-input"
                placeholder="소개 (이 어종에 대한 간단한 설명)"
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }}
              />
              <div className="encyclopedia-tip-form-grid">
                <input
                  className="site-search-input"
                  placeholder="시즌 (예: 5~10월)"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                />
                <input
                  className="site-search-input"
                  placeholder="미끼"
                  value={bait}
                  onChange={(e) => setBait(e.target.value)}
                />
                <input
                  className="site-search-input"
                  placeholder="기법"
                  value={technique}
                  onChange={(e) => setTechnique(e.target.value)}
                />
                <input
                  className="site-search-input"
                  placeholder="포인트"
                  value={habitat}
                  onChange={(e) => setHabitat(e.target.value)}
                />
              </div>
              <textarea
                className="site-search-input"
                placeholder="메모 (선택)"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }}
              />
              {submitError && <p className="encyclopedia-form-error">{submitError}</p>}
              <button
                type="submit"
                className="site-btn site-btn-primary"
                disabled={submitTip.isPending}
              >
                {submitTip.isPending ? '저장 중...' : '변경 저장'}
              </button>
            </form>
        </section>
        )}

        {showEditLogs && editLogCount > 0 && (
          <EncyclopediaEditLogModal
            fishName={data.nameKo}
            logs={data.editLogs}
            onClose={() => setShowEditLogs(false)}
          />
        )}

        {(articlesLoading || (articles && articles.length > 0)) && (
          <section className="encyclopedia-news-section">
            <h2 className="encyclopedia-section-title">관련 기사</h2>
            {articlesLoading ? (
              <p className="post-meta-muted">기사 불러오는 중...</p>
            ) : (
              <ul className="encyclopedia-news-list">
                {articles!.map((article) => (
                  <li key={article.link}>
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="encyclopedia-news-link"
                    >
                      <span className="encyclopedia-news-title">{article.title}</span>
                      {article.source && (
                        <span className="post-meta-muted">{article.source}</span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="encyclopedia-cta-wrap">
          <Link href={`/ranking?speciesId=${id}`} className="site-btn-sm">
            🏆 {data.nameKo} 랭킹
          </Link>
        </div>

        <footer className="encyclopedia-source-footer">
          <p>어류 데이터 출처: {data.dataSource}</p>
          {data.imageAttribution && (
            <p className="post-meta-muted">사진: {data.imageAttribution}</p>
          )}
        </footer>
      </div>
    </main>
  );
}
