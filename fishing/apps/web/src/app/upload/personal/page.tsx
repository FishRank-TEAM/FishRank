'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { IS_BRAG_UPLOAD_ENABLED, BRAG_UPLOAD_DISABLED_MESSAGE } from '@/lib/platform';
import UploadDisabledNotice from '@/components/UploadDisabledNotice';
import SpeciesSearchInput from '@/components/species/SpeciesSearchInput';

export default function PersonalUploadPage() {
  if (!IS_BRAG_UPLOAD_ENABLED) {
    return <UploadDisabledNotice title="자랑 기록 업로드" message={BRAG_UPLOAD_DISABLED_MESSAGE} />;
  }
  return <PersonalUploadPageInner />;
}

function PersonalUploadPageInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoggedIn, authReady } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [locationName, setLocationName] = useState('');
  const [memo, setMemo] = useState('');
  const [fishSpeciesId, setFishSpeciesId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authReady && !isLoggedIn) router.push('/auth/login');
  }, [authReady, isLoggedIn, router]);

  const { data: speciesList } = useQuery({
    queryKey: ['species'],
    queryFn: async () => {
      const res = await api.get('/species');
      return res.data.data;
    },
    enabled: isLoggedIn,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
    setError('');
  };

  const handleUpload = async () => {
    if (!file) return setError('사진을 선택해주세요.');

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', file);
      if (locationName) formData.append('locationName', locationName);
      if (memo) formData.append('memo', memo);
      if (fishSpeciesId) formData.append('fishSpeciesId', fishSpeciesId);

      await api.post('/catches/personal', formData);

      await queryClient.invalidateQueries({ queryKey: ['rankings'] });
      await queryClient.invalidateQueries({ queryKey: ['brag-feed'] });

      const params = new URLSearchParams({ rankingType: 'unofficial' });
      if (fishSpeciesId) {
        params.set('speciesId', fishSpeciesId);
      }
      router.push(`/ranking?${params.toString()}`);
    } catch (err: any) {
      setError(err.response?.data?.message || '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  if (!authReady || !isLoggedIn) return null;

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 28px' }}>
      <Link href="/my" style={{ fontSize: '13px', color: '#546e7a', textDecoration: 'none' }}>← 내 프로필</Link>
      <h2 style={{ margin: '12px 0 4px' }}>📷 자랑 기록 올리기</h2>
      <p style={{ margin: '0 0 8px', color: '#546e7a', fontSize: '13px', lineHeight: 1.6 }}>
        사진만 올리면 됩니다. 다른 낚시인의 추천으로 자랑 랭킹 순위가 정해져요.<br />
        체장·줄자 입력 없이 가볍게 자랑해 보세요.
      </p>
      <p style={{ margin: '0 0 28px', fontSize: '12px' }}>
        <Link href="/upload" style={{ color: '#1565c0', textDecoration: 'none', fontWeight: 700 }}>
          줄자 인증 기록은 여기 →
        </Link>
      </p>

      <div
        style={{
          background: '#fff', border: '2px dashed #c5cae9', borderRadius: '10px',
          padding: '24px', marginBottom: '20px', textAlign: 'center', cursor: 'pointer',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="미리보기" style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '8px', objectFit: 'contain' }} />
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🐟</div>
            <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#0b1f3a' }}>자랑할 사진을 선택하세요</p>
            <p style={{ margin: 0, fontSize: '12px', color: '#90a4ae' }}>JPG, PNG, WEBP · 최대 10MB</p>
          </>
        )}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
      </div>

      <div style={{ background: '#fff', border: '1px solid #dde3ea', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '14px' }}>📝 기록 정보 (선택)</h3>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#546e7a', marginBottom: '6px' }}>어종</label>
          <SpeciesSearchInput
            species={speciesList ?? []}
            value={fishSpeciesId}
            onChange={setFishSpeciesId}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#546e7a', marginBottom: '6px' }}>낚시 장소</label>
          <input
            type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)}
            placeholder="예: 포항 구룡포"
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #dde3ea', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#546e7a', marginBottom: '6px' }}>메모</label>
          <textarea
            value={memo} onChange={(e) => setMemo(e.target.value)}
            placeholder="오늘의 낚시 이야기..."
            rows={3}
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #dde3ea', borderRadius: '6px', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {error && (
        <div style={{ background: '#fff3e0', border: '1px solid #ffcc80', borderRadius: '6px', padding: '12px 16px', color: '#e65100', fontSize: '13px', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading || !file}
        style={{
          width: '100%', padding: '14px',
          background: uploading || !file ? '#90a4ae' : '#5c6bc0',
          color: '#fff', border: 'none', borderRadius: '8px',
          fontSize: '15px', fontWeight: 700,
          cursor: uploading || !file ? 'not-allowed' : 'pointer',
        }}
      >
        {uploading ? '저장 중...' : '자랑 기록 올리기'}
      </button>
    </main>
  );
}
