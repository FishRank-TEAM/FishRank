'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import {
  AI_RULE_LABELS,
  AI_SAMPLE_IMAGES,
  AiHealthData,
  AiTestResult,
  getStaticAssetUrl,
  speciesMethodLabel,
} from '@/lib/ai-tester.types';

const IS_DEV = process.env.NODE_ENV !== 'production';

function gradeBadgeClass(grade: string): string {
  if (grade === 'S') return 'ai-tester-grade ai-tester-grade-s';
  if (grade === 'A') return 'ai-tester-grade ai-tester-grade-a';
  return 'ai-tester-grade ai-tester-grade-b';
}

export default function AiTesterPage() {
  if (!IS_DEV) {
    return (
      <main>
        <PageHeader title="AI 테스터" description="개발 환경 전용" />
        <div className="site-container site-page-body page-narrow">
          <div className="detail-card ai-tester-disabled">
            <p>AI 테스터는 개발 환경(`npm run dev`)에서만 사용할 수 있습니다.</p>
            <Link href="/" className="site-btn-sm" style={{ marginTop: 16, display: 'inline-block' }}>
              홈으로
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <AiTesterInner />;
}

function AiTesterInner() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [health, setHealth] = useState<AiHealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AiTestResult | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await api.get('/ai/health');
      setHealth(res.data.data);
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setSelectedSample(null);
    setResult(null);
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const selectSample = (path: string) => {
    setFile(null);
    setSelectedSample(path);
    setPreview(getStaticAssetUrl(path));
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runAnalysis = async () => {
    if (!file && !selectedSample) {
      setError('이미지를 업로드하거나 샘플을 선택해 주세요.');
      return;
    }

    setAnalyzing(true);
    setError('');
    setResult(null);

    try {
      let res;
      if (file) {
        const formData = new FormData();
        formData.append('image', file);
        res = await api.post('/ai/test', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120_000,
        });
      } else if (selectedSample) {
        res = await api.post('/ai/test-by-url', { imageUrl: selectedSample }, { timeout: 120_000 });
      }

      setResult(res!.data.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'AI 분석에 실패했습니다.');
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setFile(null);
    setSelectedSample(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <main>
      <PageHeader
        title="AI 테스터"
        description="학습된 YOLO 어종 분류 · 줄자 인식 · 등급 판정 테스트 (DB 저장 없음)"
      />

      <div className="site-container site-page-body page-narrow ai-tester-page">
        <section className="detail-card ai-tester-status-card">
          <div className="ai-tester-status-row">
            <div>
              <h3 className="detail-card-title">서버 상태</h3>
              <p className="post-meta-muted">NestJS API → FastAPI AI 서버 연결</p>
            </div>
            <button type="button" className="site-btn-ghost" onClick={refreshHealth} disabled={healthLoading}>
              {healthLoading ? '확인 중…' : '새로고침'}
            </button>
          </div>
          <div className="ai-tester-status-grid">
            <StatusPill
              label="API"
              online={health?.apiOnline ?? false}
              detail="NestJS :4000"
            />
            <StatusPill
              label="AI 서버"
              online={health?.aiServerOnline ?? false}
              detail={health?.aiServerUrl ?? '—'}
            />
            <StatusPill
              label="YOLO 모델"
              online={health?.yoloReady ?? false}
              detail={
                health?.yoloReady
                  ? `${health.yoloClassCount ?? 38}종 · ${health.inferenceVersion ?? '?'}`
                  : 'best.pt 없음 → CLIP 폴백'
              }
            />
          </div>
          {health && !health.aiServerOnline && (
            <p className="ai-tester-hint">
              AI 서버가 꺼져 있습니다. 루트에서 <code>npm run dev:all</code> 실행 후 새로고침하세요.
            </p>
          )}
          {health?.aiServerOnline && !health.yoloReady && (
            <p className="ai-tester-hint">
              YOLO 가중치가 없습니다. <code>npm run ai:train</code> 후 AI 서버를 재시작하세요.
            </p>
          )}
          {health?.aiServerOnline && health.yoloReady && health.inferenceVersion !== 'crop-v2' && (
            <p className="ai-tester-hint">
              AI 추론 버전이 오래됐습니다. 터미널에서 <code>npm run ai:restart</code> 후 새로고침하세요.
              (현재: {health.inferenceVersion ?? 'unknown'}, 필요: crop-v2)
            </p>
          )}
        </section>

        <div className="ai-tester-layout">
          <section className="detail-card">
            <h3 className="detail-card-title">1. 이미지 선택</h3>

            <div
              className="upload-dropzone ai-tester-dropzone"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="미리보기" className="ai-tester-preview" />
              ) : (
                <>
                  <div className="site-empty-icon">🧪</div>
                  <p className="upload-dropzone-title">클릭해서 사진 업로드</p>
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

            <p className="ai-tester-section-label">또는 시드 샘플 (빠른 테스트)</p>
            <div className="ai-tester-samples">
              {AI_SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.path}
                  type="button"
                  className={`ai-tester-sample-btn${selectedSample === sample.path ? ' is-active' : ''}`}
                  onClick={() => selectSample(sample.path)}
                >
                  <img src={getStaticAssetUrl(sample.path)} alt={sample.label} />
                  <span>{sample.label}</span>
                </button>
              ))}
            </div>

            <div className="form-actions" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="site-btn-sm"
                onClick={runAnalysis}
                disabled={analyzing || (!file && !selectedSample) || !health?.aiServerOnline}
                style={{ flex: 1 }}
              >
                {analyzing ? 'AI 분석 중…' : 'AI 분석 실행'}
              </button>
              <button type="button" className="site-btn-ghost" onClick={reset} disabled={analyzing}>
                초기화
              </button>
            </div>

            {error && <p className="form-error" style={{ marginTop: 12 }}>{error}</p>}
          </section>

          <section className="detail-card ai-tester-result-card">
            <h3 className="detail-card-title">2. 분석 결과</h3>

            {!result ? (
              <div className="ai-tester-empty">
                <p className="post-meta-muted">이미지를 선택하고 분석을 실행하면 결과가 표시됩니다.</p>
              </div>
            ) : (
              <>
                <div className="ai-tester-result-head">
                  <span className={gradeBadgeClass(result.grade)}>{result.grade}등급</span>
                  <span className={`ai-tester-status-tag ${result.status === 'approved' ? 'is-ok' : 'is-fail'}`}>
                    {result.status === 'approved' ? '승인' : '반려'}
                  </span>
                  <span className="post-meta-muted">{result.processingMs}ms</span>
                </div>

                <div className="ai-tester-metrics">
                  <Metric label="길이" value={result.analysis.rulerLengthCm != null ? `${result.analysis.rulerLengthCm} cm` : '—'} />
                  <Metric
                    label="어종"
                    value={
                      result.species?.nameKo
                      ?? result.analysis.speciesDisplayName
                      ?? result.analysis.speciesDetected
                    }
                    sub={`${speciesMethodLabel(result.analysis.speciesMethod)} · 신뢰도 ${Math.round(result.analysis.speciesConfidence * 100)}%`}
                  />
                  <Metric
                    label="랭킹 점수 (예상)"
                    value={result.rankScorePreview != null ? String(result.rankScorePreview) : '—'}
                  />
                  <Metric
                    label="줄자 인식"
                    value={result.analysis.rulerDetected ? '성공' : '실패'}
                  />
                </div>

                <p className="ai-tester-reason">{result.gradeReason}</p>
                {result.analysis.errorMessage && result.status === 'rejected' && (
                  <p className="ai-tester-error-msg">{result.analysis.errorMessage}</p>
                )}

                <h4 className="ai-tester-subtitle">촬영 규칙</h4>
                <ul className="ai-tester-rules">
                  {AI_RULE_LABELS.map(({ key, label }) => (
                    <li key={key} className={result.rules[key] ? 'is-pass' : 'is-fail'}>
                      <span>{result.rules[key] ? '✓' : '✗'}</span>
                      {label}
                    </li>
                  ))}
                </ul>

                {!!result.analysis.speciesTopCandidates?.length && (
                  <>
                    <h4 className="ai-tester-subtitle">
                      어종 Top 후보 ({speciesMethodLabel(result.analysis.speciesMethod)})
                    </h4>
                    <ul className="ai-tester-candidates">
                      {result.analysis.speciesTopCandidates.map((item) => (
                        <li key={item.slug}>
                          <span>
                            {item.nameKo ?? item.slug}
                            <small>{item.slug}</small>
                          </span>
                          <strong>{Math.round(item.score * 100)}%</strong>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <button
                  type="button"
                  className="site-btn-ghost ai-tester-raw-toggle"
                  onClick={() => setShowRaw((v) => !v)}
                >
                  {showRaw ? 'Raw JSON 숨기기' : 'Raw JSON 보기'}
                </button>
                {showRaw && (
                  <pre className="ai-tester-raw">{JSON.stringify(result, null, 2)}</pre>
                )}
              </>
            )}
          </section>
        </div>

        <p className="ai-tester-footer-note">
          이 페이지는 개발용입니다. 분석 결과는 DB에 저장되지 않습니다.{' '}
          <Link href="/upload">실제 인증 업로드 →</Link>
        </p>
      </div>
    </main>
  );
}

function StatusPill({
  label,
  online,
  detail,
}: {
  label: string;
  online: boolean;
  detail: string;
}) {
  return (
    <div className={`ai-tester-pill${online ? ' is-online' : ' is-offline'}`}>
      <span className="ai-tester-pill-dot" />
      <div>
        <strong>{label}</strong>
        <span>{online ? '연결됨' : '오프라인'}</span>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ai-tester-metric">
      <span className="ai-tester-metric-label">{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}
