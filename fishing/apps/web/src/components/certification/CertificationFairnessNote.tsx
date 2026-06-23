'use client';

import { useState } from 'react';
import { CERTIFICATION_FAIRNESS_POINTS } from '@/lib/platform';

type Props = {
  variant?: 'compact' | 'inline';
  className?: string;
};

export default function CertificationFairnessNote({ variant = 'compact', className = '' }: Props) {
  const [open, setOpen] = useState(variant === 'inline');

  if (variant === 'inline') {
    return (
      <div className={`cert-fairness-note cert-fairness-note-inline ${className}`.trim()}>
        <p className="cert-fairness-note-lead">
          <strong>공식 인증</strong>은 모바일 앱에서 AR 가이드 + AI로 <em>실시간 촬영</em>한 기록만 랭킹에 반영됩니다.
          갤러리·웹 업로드는 허용하지 않아 미리 찍은 사진·도용을 원천 차단합니다.
        </p>
      </div>
    );
  }

  return (
    <div className={`cert-fairness-note ${className}`.trim()}>
      <button
        type="button"
        className="cert-fairness-note-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>⚖️ 공식 인증 — 앱 AR+AI 실시간 촬영 전용</span>
        <span aria-hidden>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="cert-fairness-note-list">
          {CERTIFICATION_FAIRNESS_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
