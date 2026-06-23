'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { IS_CERTIFIED_UPLOAD_ENABLED } from '@/lib/platform';
import UploadDisabledNotice from '@/components/UploadDisabledNotice';
import PageHeader from '@/components/layout/PageHeader';

import CertificationGradeGuide from '@/components/certification/CertificationGradeGuide';
import { CAPTURE_RULES } from '@/lib/certification-grade';

export default function UploadPage() {
  if (!IS_CERTIFIED_UPLOAD_ENABLED) {
    return <UploadDisabledNotice />;
  }
  return <UploadPageInner />;
}

function UploadPageInner() {
  const router = useRouter();
  const { isLoggedIn } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [locationName, setLocationName] = useState('');
  const [memo, setMemo] = useState('');
  const [checkedRules, setCheckedRules] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const allRulesChecked = CAPTURE_RULES.every((r) => checkedRules[r.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
    setResult(null);
    setError('');
  };

  const toggleRule = (id: string) => {
    setCheckedRules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpload = async () => {
    if (!file) return setError('사진을 선택해주세요.');
    if (!allRulesChecked) return setError('촬영 규칙 4가지를 모두 확인해주세요.');
    if (!isLoggedIn) {
      router.push('/auth/login');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', file);
      if (locationName) formData.append('locationName', locationName);
      if (memo) formData.append('memo', memo);

      const res = await api.post('/catches', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const catchId = res.data.data.catchId;

      // AI 처리 결과 폴링
      let attempts = 0;
      const poll = async () => {
        if (attempts >= 15) {
          setResult({ status: 'pending', message: '분석 중입니다. 내 기록 페이지에서 확인하세요.' });
          return;
        }
        attempts++;
        const statusRes = await api.get(`/catches/${catchId}/status`);
        const { status } = statusRes.data.data;
        if (status !== 'pending') {
          setResult(statusRes.data.data);
        } else {
          setTimeout(poll, 2000);
        }
      };
      setTimeout(poll, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || '업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  };

  if (result && result.status === 'approved') {
    return (
      <main>
        <PageHeader title="인증 완료" description="AI 줄자 인증 · 랭킹 반영" />
        <div className="site-container site-page-body page-narrow">
          <div className="detail-card" style={{ textAlign: 'center', padding: '40px 28px' }}>
            <div className="site-empty-icon">🎉</div>
            <h2 className="post-detail-title" style={{ fontSize: 20 }}>인증 완료!</h2>
            <span className="site-badge site-badge-green" style={{ margin: '12px 0 20px', display: 'inline-block', padding: '8px 16px', fontSize: 13 }}>
              AI인증 {result.grade}등급
            </span>
            <div className="upload-success-length">
              {result.lengthCm ? `${Number(result.lengthCm).toFixed(1)}cm` : '-'}
            </div>
            {result.fishSpecies && (
              <p className="content-prose-sm" style={{ marginBottom: 24 }}>{result.fishSpecies} 측정 완료</p>
            )}
            <div className="form-actions" style={{ justifyContent: 'center' }}>
              <button type="button" onClick={() => router.push('/ranking')} className="site-btn-sm" style={{ flex: 'none', padding: '12px 24px' }}>
                🏆 랭킹 확인하기
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setPreview(null);
                  setFile(null);
                  setCheckedRules({});
                }}
                className="site-btn-ghost"
              >
                또 업로드하기
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <PageHeader title="인증 기록 업로드" description="줄자와 함께 찍은 사진으로 공식 인증 · 랭킹 반영" />
      <div className="site-container site-page-body page-narrow">
        <p style={{ margin: '0 0 20px', fontSize: 12 }}>
          <Link href="/upload/personal" className="upload-alt-link">
            줄자 없이 자랑만? 비공식 기록 →
          </Link>
        </p>

        <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0}>
        {preview ? (
          <img
            src={preview}
            alt="미리보기"
            style={{
              maxWidth: '100%',
              maxHeight: '320px',
              borderRadius: '8px',
              objectFit: 'contain',
            }}
          />
        ) : (
          <>
            <div className="site-empty-icon">📷</div>
            <p className="upload-dropzone-title">사진을 클릭해서 선택하세요</p>
            <p className="post-meta-muted">JPG, PNG, WEBP · 최대 10MB</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      <div className="detail-card" style={{ marginBottom: 20 }}>
        <h3 className="detail-card-title">📋 촬영 규칙 확인 (4가지 모두 체크 필수)</h3>
        <div className="upload-rule-list">
          {CAPTURE_RULES.map((rule) => (
            <label key={rule.id}>
              <input
                type="checkbox"
                checked={!!checkedRules[rule.id]}
                onChange={() => toggleRule(rule.id)}
                style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0 }}
              />
              <div>
                <div className="upload-rule-label">{rule.label}</div>
                <div className="post-meta-muted">{rule.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="detail-card" style={{ marginBottom: 20 }}>
        <CertificationGradeGuide />
      </div>

      <div className="detail-card" style={{ marginBottom: 20 }}>
        <h3 className="detail-card-title">📍 추가 정보 (선택)</h3>
        <div className="site-form-field">
          <label className="site-form-label">낚시 장소</label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="예: 춘천 소양강, 거제 외포항"
            className="site-form-input"
          />
        </div>
        <div className="site-form-field" style={{ marginBottom: 0 }}>
          <label className="site-form-label">메모</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="오늘의 낚시 기록..."
            rows={3}
            className="form-textarea"
            style={{ minHeight: 80 }}
          />
        </div>
      </div>

      {error && <div className="site-alert-error">⚠️ {error}</div>}

      <button
        type="button"
        onClick={handleUpload}
        disabled={uploading || !file || !allRulesChecked}
        className="site-btn-primary"
        style={{ padding: 14, fontSize: 15 }}
      >
        {uploading ? '🤖 AI 분석 중...' : '🚀 AI 측정 시작하기'}
      </button>
      </div>
    </main>
  );
}
