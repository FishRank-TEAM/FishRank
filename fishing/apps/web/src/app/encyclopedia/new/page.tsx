'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import PageBackLink from '@/components/layout/PageBackLink';
import { useAuthStore } from '@/store/auth.store';
import {
  FISH_CATEGORY_OPTIONS,
  type FishSpeciesCategory,
} from '@fishrank/shared';

export default function EncyclopediaNewPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuthStore();

  const [nameKo, setNameKo] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [category, setCategory] = useState<FishSpeciesCategory>('freshwater');
  const [summary, setSummary] = useState('');
  const [season, setSeason] = useState('');
  const [bait, setBait] = useState('');
  const [technique, setTechnique] = useState('');
  const [habitat, setHabitat] = useState('');
  const [note, setNote] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('nameKo', nameKo.trim());
      formData.append('category', category);
      if (nameEn.trim()) formData.append('nameEn', nameEn.trim());
      if (scientificName.trim()) formData.append('scientificName', scientificName.trim());
      if (summary.trim()) formData.append('summary', summary.trim());
      if (season.trim()) formData.append('season', season.trim());
      if (bait.trim()) formData.append('bait', bait.trim());
      if (technique.trim()) formData.append('technique', technique.trim());
      if (habitat.trim()) formData.append('habitat', habitat.trim());
      if (note.trim()) formData.append('note', note.trim());
      if (imageFile) formData.append('image', imageFile);

      const res = await api.post('/encyclopedia', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data as { speciesId: number };
    },
    onSuccess: (data) => {
      router.push(`/encyclopedia/${data.speciesId}`);
    },
    onError: (err: { response?: { data?: { message?: string | string[] } } }) => {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message ?? '등록에 실패했습니다.');
    },
  });

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  if (!isLoggedIn) {
    return (
      <main>
        <div className="site-container site-page-body page-narrow">
          <PageBackLink href="/encyclopedia" label="어종 목록" />
          <div className="site-empty">
            <div className="site-empty-icon">🐟</div>
            <p>어종을 추가하려면 로그인이 필요합니다.</p>
            <Link href="/auth/login" className="site-btn site-btn-primary" style={{ marginTop: 16 }}>
              로그인하기
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="site-container site-page-body page-narrow">
        <PageBackLink href="/encyclopedia" label="어종 목록" />

        <header className="encyclopedia-new-head">
          <h1 className="encyclopedia-new-title">어종 추가</h1>
          <p className="post-meta-muted">
            사전에 없는 어종을 등록해 주세요. 등록 후 다른 낚시인도 정보를 보완할 수 있어요.
          </p>
        </header>

        <form
          className="encyclopedia-tip-form encyclopedia-new-form"
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            if (nameKo.trim().length < 2) {
              setError('어종 이름을 2자 이상 입력해 주세요.');
              return;
            }
            createMutation.mutate();
          }}
        >
          <label className="encyclopedia-new-field">
            <span>어종 이름 (필수)</span>
            <input
              className="site-search-input"
              value={nameKo}
              onChange={(e) => setNameKo(e.target.value)}
              placeholder="예: 강준치"
              required
              maxLength={80}
            />
          </label>

          <label className="encyclopedia-tip-category-field">
            <span className="encyclopedia-tip-category-label">분류 (필수)</span>
            <div className="encyclopedia-tip-category-options">
              {FISH_CATEGORY_OPTIONS.map((option) => (
                <label key={option.value} className="encyclopedia-tip-category-option">
                  <input
                    type="radio"
                    name="fish-category-new"
                    value={option.value}
                    checked={category === option.value}
                    onChange={() => setCategory(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </label>

          <div className="encyclopedia-tip-form-grid">
            <input
              className="site-search-input"
              placeholder="영문 이름 (선택)"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              maxLength={120}
            />
            <input
              className="site-search-input"
              placeholder="학명 (선택)"
              value={scientificName}
              onChange={(e) => setScientificName(e.target.value)}
              maxLength={160}
            />
          </div>

          <label className="encyclopedia-tip-image-field">
            <span className="encyclopedia-tip-image-label">대표 사진 (선택)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
            />
            {imagePreview && (
              <div className="encyclopedia-tip-image-preview">
                <img src={imagePreview} alt="미리보기" />
                <button type="button" className="encyclopedia-tip-image-remove" onClick={() => handleImageChange(null)}>
                  제거
                </button>
              </div>
            )}
          </label>

          <textarea
            className="site-search-input"
            placeholder="소개 (선택)"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            style={{ width: '100%', resize: 'vertical' }}
            maxLength={500}
          />

          <div className="encyclopedia-tip-form-grid">
            <input className="site-search-input" placeholder="시즌 (선택)" value={season} onChange={(e) => setSeason(e.target.value)} />
            <input className="site-search-input" placeholder="미끼 (선택)" value={bait} onChange={(e) => setBait(e.target.value)} />
            <input className="site-search-input" placeholder="기법 (선택)" value={technique} onChange={(e) => setTechnique(e.target.value)} />
            <input className="site-search-input" placeholder="포인트 (선택)" value={habitat} onChange={(e) => setHabitat(e.target.value)} />
          </div>

          <textarea
            className="site-search-input"
            placeholder="메모 (선택)"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ width: '100%', resize: 'vertical' }}
            maxLength={500}
          />

          {error && <p className="encyclopedia-form-error">{error}</p>}

          <button type="submit" className="site-btn site-btn-primary" disabled={createMutation.isPending}>
            {createMutation.isPending ? '등록 중...' : '어종 등록하기'}
          </button>
        </form>
      </div>
    </main>
  );
}
