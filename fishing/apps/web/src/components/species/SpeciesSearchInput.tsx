'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type FishSpeciesOption = {
  id: number;
  nameKo: string;
  nameEn?: string | null;
  scientificName?: string | null;
  category?: string;
};

type Props = {
  species: FishSpeciesOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
};

const MAX_RESULTS = 12;

function matchSpecies(species: FishSpeciesOption, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;
  return (
    species.nameKo.toLowerCase().includes(needle) ||
    (species.nameEn?.toLowerCase().includes(needle) ?? false) ||
    (species.scientificName?.toLowerCase().includes(needle) ?? false)
  );
}

function categoryLabel(category?: string) {
  if (category === 'saltwater') return '바다';
  if (category === 'both') return '민·바다';
  if (category === 'freshwater') return '민물';
  return null;
}

export default function SpeciesSearchInput({
  species,
  value,
  onChange,
  placeholder = '어종 이름 검색 (예: 붕어, 광어)',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => species.find((item) => String(item.id) === value),
    [species, value],
  );

  useEffect(() => {
    if (selected) {
      setQuery(selected.nameKo);
      return;
    }
    if (!value) {
      setQuery('');
    }
  }, [selected, value]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return species.filter((item) => matchSpecies(item, trimmed)).slice(0, MAX_RESULTS);
  }, [species, query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        if (selected) {
          setQuery(selected.nameKo);
        } else if (!value) {
          setQuery('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selected, value]);

  const handleSelect = (item: FishSpeciesOption | null) => {
    if (!item) {
      onChange('');
      setQuery('');
    } else {
      onChange(String(item.id));
      setQuery(item.nameKo);
    }
    setOpen(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setQuery(next);
    setOpen(true);

    if (!next.trim()) {
      onChange('');
      return;
    }

    if (selected && next !== selected.nameKo) {
      onChange('');
    }
  };

  return (
    <div ref={containerRef} className="species-search">
      <div className="species-search-field">
        <input
          type="text"
          className="site-form-input species-search-input"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        {value && (
          <button
            type="button"
            className="species-search-clear"
            onClick={() => handleSelect(null)}
            aria-label="어종 선택 해제"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <ul className="species-search-dropdown" role="listbox">
          <li>
            <button
              type="button"
              className={`species-search-option${!value ? ' active' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(null)}
            >
              모름 / 선택 안 함
            </button>
          </li>

          {!query.trim() ? (
            <li className="species-search-hint">이름을 입력하면 어종을 검색할 수 있어요</li>
          ) : results.length === 0 ? (
            <li className="species-search-empty">검색 결과가 없습니다</li>
          ) : (
            results.map((item) => {
              const tag = categoryLabel(item.category);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`species-search-option${value === String(item.id) ? ' active' : ''}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(item)}
                  >
                    <span className="species-search-option-main">
                      <span className="species-search-option-name">{item.nameKo}</span>
                      {item.nameEn && (
                        <span className="species-search-option-sub">{item.nameEn}</span>
                      )}
                    </span>
                    {tag && (
                      <span className={`species-search-option-tag ${item.category}`}>{tag}</span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
