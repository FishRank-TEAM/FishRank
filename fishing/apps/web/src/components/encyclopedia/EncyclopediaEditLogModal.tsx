'use client';

import { useEffect } from 'react';

type EditLogChange = {
  field: string;
  label: string;
  oldValue: string | null;
  newValue: string | null;
};

export type EncyclopediaEditLog = {
  id: string;
  userId: string;
  nickname: string;
  changes: EditLogChange[];
  createdAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatChangeValue(field: string, value: string | null) {
  if (!value) return '(없음)';
  if (field === 'imageUrl') return '사진 변경';
  return value.length > 48 ? `${value.slice(0, 48)}…` : value;
}

type Props = {
  fishName: string;
  logs: EncyclopediaEditLog[];
  onClose: () => void;
};

export default function EncyclopediaEditLogModal({ fishName, logs, onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="encyclopedia-edit-log-backdrop" onClick={onClose}>
      <div
        className="encyclopedia-edit-log-popup"
        role="dialog"
        aria-labelledby="encyclopedia-edit-log-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="encyclopedia-edit-log-popup-head">
          <div>
            <h3 id="encyclopedia-edit-log-title">수정 기록</h3>
            <p className="encyclopedia-edit-log-popup-sub">{fishName}</p>
          </div>
          <button
            type="button"
            className="encyclopedia-edit-log-popup-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div className="encyclopedia-edit-log-popup-body">
          {logs.map((log) => (
            <article key={log.id} className="encyclopedia-edit-log-card">
              <div className="encyclopedia-edit-log-head">
                <strong>{log.nickname}</strong>
                <time dateTime={log.createdAt}>{formatDate(log.createdAt)}</time>
              </div>
              <ul className="encyclopedia-edit-log-changes">
                {log.changes.map((change) => (
                  <li key={`${log.id}-${change.field}`}>
                    <span className="encyclopedia-edit-log-field">{change.label}</span>
                    <span className="encyclopedia-edit-log-values">
                      {formatChangeValue(change.field, change.oldValue)}
                      <span className="encyclopedia-edit-log-arrow">→</span>
                      {formatChangeValue(change.field, change.newValue)}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
