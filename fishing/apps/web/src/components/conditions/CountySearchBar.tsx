'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { loadRecentCounties, pushRecentCounty } from '@/lib/conditions-recent';

const SUGGESTIONS = ['구미', '충주', '여주', '수원', '경주', '전남', '경북'];

type Props = {
  value: string;
  onApply: (q: string) => void;
  regionHint?: string | null;
  compact?: boolean;
};

export default function CountySearchBar({ value, onApply, regionHint, compact = false }: Props) {
  const [draft, setDraft] = useState(value);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    setRecent(loadRecentCounties());
  }, []);

  const apply = (q: string) => {
    const trimmed = q.trim();
    setDraft(trimmed);
    onApply(trimmed);
    if (trimmed) setRecent(pushRecentCounty(trimmed));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    apply(draft);
  };

  const chips = recent.length ? recent : SUGGESTIONS;

  return (
    <section className={`conditions-county-search${compact ? ' compact' : ''}`}>
      {!compact && <label htmlFor="county-q">어느 지역 저수지를 볼까요?</label>}
      <form className="conditions-county-search-row" onSubmit={handleSubmit}>
        <input
          id="county-q"
          type="search"
          placeholder={
            regionHint
              ? `시·군·구 검색 (예: 충주, 비우면 ${regionHint})`
              : '시·군·구 검색 (예: 구미, 충주, 여주)'
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className="county-search-btn">
          검색
        </button>
        {value ? (
          <button type="button" className="county-search-btn ghost" onClick={() => apply('')}>
            초기화
          </button>
        ) : null}
      </form>
      <div className="conditions-county-chips" aria-label="최근·추천 지역">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            className={`conditions-county-chip${value === chip ? ' active' : ''}`}
            onClick={() => apply(chip)}
          >
            {chip}
          </button>
        ))}
      </div>
    </section>
  );
}
