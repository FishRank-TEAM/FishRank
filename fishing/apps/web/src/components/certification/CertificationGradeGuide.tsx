'use client';

import { useState } from 'react';
import { CERTIFICATION_GRADES } from '@/lib/certification-grade';

type Props = {
  variant?: 'compact' | 'full';
  className?: string;
};

export default function CertificationGradeGuide({ variant = 'full', className = '' }: Props) {
  const [open, setOpen] = useState(variant === 'full');

  if (variant === 'compact') {
    return (
      <div className={`cert-grade-guide cert-grade-guide-compact ${className}`.trim()}>
        <button
          type="button"
          className="cert-grade-guide-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span>등급 기준 (S/A/B)</span>
          <span aria-hidden>{open ? '▲' : '▼'}</span>
        </button>
        {open && <GradeTable />}
      </div>
    );
  }

  return (
    <div className={`cert-grade-guide ${className}`.trim()}>
      <h3 className="cert-grade-guide-title">인증 등급 기준</h3>
      <p className="cert-grade-guide-desc">
        AI가 촬영 규칙·줄자 인식·어종 신뢰도를 검사해 S / A / B 등급을 부여합니다.
      </p>
      <GradeTable />
    </div>
  );
}

function GradeTable() {
  return (
    <div className="cert-grade-guide-grid">
      {CERTIFICATION_GRADES.map((item) => (
        <article key={item.grade} className={`cert-grade-card cert-grade-card-${item.grade.toLowerCase()}`}>
          <header className="cert-grade-card-head">
            <span className={`cert-grade-badge cert-grade-badge-${item.grade.toLowerCase()}`}>{item.grade}</span>
            <div>
              <h4>{item.label}</h4>
              <p>{item.summary}</p>
            </div>
          </header>
          <ul>
            {item.criteria.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <footer>{item.ranking}</footer>
        </article>
      ))}
    </div>
  );
}
