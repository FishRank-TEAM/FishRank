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
          공식 인증은 <strong>앱에서 실시간 촬영</strong>한 기록만 랭킹에 반영됩니다.
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
        <span>형평성 · 앱 촬영 전용</span>
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
