'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  DEFAULT_RANKING_SPECIES_ID,
  type RankingTypeKey,
  type RankingSpeciesCategory,
} from '@/lib/ranking.constants';

type RankingFilterState = {
  period: string;
  setPeriod: (period: string) => void;
  speciesId: number;
  setSpeciesId: (id: number) => void;
  speciesCategory: RankingSpeciesCategory;
  setSpeciesCategory: (category: RankingSpeciesCategory) => void;
  rankingType: RankingTypeKey;
  setRankingType: (type: RankingTypeKey) => void;
};

const RankingFilterContext = createContext<RankingFilterState | null>(null);

export function RankingFilterProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState('weekly');
  const [speciesId, setSpeciesId] = useState(DEFAULT_RANKING_SPECIES_ID);
  const [speciesCategory, setSpeciesCategory] = useState<RankingSpeciesCategory>('freshwater');
  const [rankingType, setRankingType] = useState<RankingTypeKey>('official');

  return (
    <RankingFilterContext.Provider
      value={{
        period,
        setPeriod,
        speciesId,
        setSpeciesId,
        speciesCategory,
        setSpeciesCategory,
        rankingType,
        setRankingType,
      }}
    >
      {children}
    </RankingFilterContext.Provider>
  );
}

export function useRankingFilters() {
  const ctx = useContext(RankingFilterContext);
  if (!ctx) {
    throw new Error('useRankingFilters must be used within RankingFilterProvider');
  }
  return ctx;
}
