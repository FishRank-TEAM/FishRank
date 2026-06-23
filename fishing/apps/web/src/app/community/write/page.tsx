'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import PageHeader from '@/components/layout/PageHeader';
import PageBackLink from '@/components/layout/PageBackLink';

export default function WritePage() {
  const router = useRouter();
  const { isLoggedIn } = useAuthStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCatchId, setSelectedCatchId] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn) router.push('/auth/login');
  }, [isLoggedIn, router]);

  const { data: myCatches } = useQuery({
    queryKey: ['my-catches-select'],
    queryFn: async () => {
      const res = await api.get('/catches/me?limit=20');
      return res.data.data.items.filter((c: { status: string; recordType: string }) =>
        c.status === 'approved' && c.recordType === 'certified',
      );
    },
    enabled: isLoggedIn,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('제목을 입력해주세요.');
    if (!content.trim()) return setError('내용을 입력해주세요.');

    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      if (selectedCatchId) formData.append('catchId', selectedCatchId);
      if (imageFile) formData.append('image', imageFile);

      const res = await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      router.push(`/community/${res.data.data.id}`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || '글 작성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <main>
      <PageHeader title="글 쓰기" description="낚시 이야기 · 포인트 · 장비 정보를 공유하세요" />

      <div className="site-container site-page-body page-narrow">
        <PageBackLink href="/community" label="목록으로" />
        <form onSubmit={handleSubmit} className="detail-card">
          <div className="site-form-field">
            <label className="site-form-label">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="글 제목을 입력하세요"
              maxLength={100}
              className="site-form-input"
            />
          </div>

          <div className="site-form-field">
            <label className="site-form-label">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="낚시 경험, 포인트 정보, 장비 추천 등 자유롭게 써주세요..."
              rows={8}
              className="form-textarea"
            />
          </div>

          <div className="site-form-field">
            <label className="site-form-label">📷 사진 첨부 (선택)</label>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} />
            {imagePreview && (
              <div className="image-preview-wrap">
                <img src={imagePreview} alt="미리보기" />
              </div>
            )}
          </div>

          {myCatches && myCatches.length > 0 && (
            <div className="form-panel">
              <label className="site-form-label">🐟 낚시 기록 첨부 (선택)</label>
              <select
                value={selectedCatchId}
                onChange={(e) => setSelectedCatchId(e.target.value)}
                className="site-form-select"
              >
                <option value="">첨부 안 함</option>
                {myCatches.map((c: {
                  id: string;
                  fishSpecies?: { nameKo: string };
                  lengthCm?: number;
                  locationName?: string;
                }) => (
                  <option key={c.id} value={c.id}>
                    {c.fishSpecies?.nameKo ?? '어종 미확인'} ·{' '}
                    {c.lengthCm ? `${Number(c.lengthCm).toFixed(1)}cm` : '-'} ·{' '}
                    {c.locationName || '위치 미입력'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <div className="site-alert-error">⚠️ {error}</div>}

          <div className="form-actions">
            <button type="submit" disabled={loading} className="site-btn-primary">
              {loading ? '등록 중...' : '글 등록하기'}
            </button>
            <button type="button" onClick={() => router.back()} className="site-btn-ghost">
              취소
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
