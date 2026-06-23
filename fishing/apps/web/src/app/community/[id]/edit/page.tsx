'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/images';
import { useAuthStore } from '@/store/auth.store';
import PageHeader from '@/components/layout/PageHeader';
import PageBackLink from '@/components/layout/PageBackLink';

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isLoggedIn, authReady, user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCatchId, setSelectedCatchId] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authReady && !isLoggedIn) router.push('/auth/login');
  }, [authReady, isLoggedIn, router]);

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const res = await api.get(`/posts/${id}`);
      return res.data.data;
    },
    enabled: isLoggedIn,
  });

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

  useEffect(() => {
    if (!post) return;
    if (user && post.user.id !== user.id) {
      router.replace(`/community/${id}`);
      return;
    }
    setTitle(post.title);
    setContent(post.content);
    setSelectedCatchId(post.catchId ?? '');
    setImagePreview(post.imageUrl ? getImageUrl(post.imageUrl) : null);
    setRemoveImage(false);
    setImageFile(null);
  }, [post, user, router, id]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
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
      formData.append('catchId', selectedCatchId);
      if (removeImage) formData.append('removeImage', 'true');
      if (imageFile) formData.append('image', imageFile);

      await api.patch(`/posts/${id}`, formData);
      router.push(`/community/${id}`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof message === 'string' ? message : '글 수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!authReady || !isLoggedIn) return null;

  if (isLoading || !post) {
    return (
      <main>
        <div className="site-container site-page-body site-empty">
          <div className="site-empty-icon">🎣</div>
          <p>불러오는 중...</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <PageHeader title="글 수정" description="작성한 글을 수정합니다" />

      <div className="site-container site-page-body page-narrow">
        <PageBackLink href={`/community/${id}`} label="글로 돌아가기" />
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
            {imagePreview && !removeImage && (
              <div className="image-preview-wrap">
                <img src={imagePreview} alt="미리보기" />
              </div>
            )}
            {post.imageUrl && (
              <label className="post-edit-remove-image">
                <input
                  type="checkbox"
                  checked={removeImage}
                  onChange={(e) => {
                    setRemoveImage(e.target.checked);
                    if (e.target.checked) {
                      setImageFile(null);
                      setImagePreview(null);
                    } else {
                      setImagePreview(post.imageUrl ? getImageUrl(post.imageUrl) : null);
                    }
                  }}
                />
                기존 사진 삭제
              </label>
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
              {loading ? '저장 중...' : '수정 완료'}
            </button>
            <button type="button" onClick={() => router.push(`/community/${id}`)} className="site-btn-ghost">
              취소
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
