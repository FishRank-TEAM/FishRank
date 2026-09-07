'use client';

import type { ConditionsMode } from '@/lib/marine-conditions';

type Props = {
  mode: ConditionsMode;
  onChange: (mode: ConditionsMode) => void;
};

export default function ConditionsModeTabs({ mode, onChange }: Props) {
  return (
    <div className="conditions-mode-tabs" role="tablist" aria-label="출조 유형">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'sea'}
        className={mode === 'sea' ? 'active' : undefined}
        onClick={() => onChange('sea')}
      >
        바다 · 낚시지수
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'fresh'}
        className={mode === 'fresh' ? 'active' : undefined}
        onClick={() => onChange('fresh')}
      >
        민물 · 저수지
      </button>
    </div>
  );
}
