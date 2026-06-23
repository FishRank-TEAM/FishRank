'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import RankingTabs from '@/components/RankingTabs';
import RankingFilters from '@/components/ranking/RankingFilters';
import RankingTypeTabs from '@/components/ranking/RankingTypeTabs';
import CertificationGradeGuide from '@/components/certification/CertificationGradeGuide';
import { RankingFilterProvider, useRankingFilters } from '@/components/ranking/RankingFilterContext';
import { isValidRankingSpeciesId } from '@/lib/ranking.constants';
import { IS_BRAG_UPLOAD_ENABLED } from '@/lib/platform';
import Link from 'next/link';
import { preloadKakaoMap } from '@/lib/kakao-map-loader';
import { loadSidoGeoJson } from '@/lib/geo/geoJsonLoader';

function RankingShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isRegional = pathname.startsWith('/ranking/regional');
  const { period, setPeriod, speciesId, setSpeciesId, rankingType, setRankingType } = useRankingFilters();

  useEffect(() => {
    const type = searchParams.get('rankingType');
    if (type === 'official' || type === 'unofficial') {
      setRankingType(type);
    }

    const sid = searchParams.get('speciesId');
    if (sid !== null) {
      const id = Number(sid);
      if (isValidRankingSpeciesId(id)) {
        setSpeciesId(id);
      }
      return;
    }

    if (type === 'unofficial') {
      setSpeciesId(0);
    }
  }, [searchParams, setSpeciesId, setRankingType]);

  useEffect(() => {
    void preloadKakaoMap().catch(() => {});
    void loadSidoGeoJson();
  }, []);

  return (
    <div className="ranking-page">
      <header className="ranking-page-head">
        <h1 className="ranking-page-title">랭킹</h1>
        <RankingTypeTabs />
        <RankingTabs />
        <RankingFilters
          period={period}
          onPeriodChange={setPeriod}
          speciesId={speciesId}
          onSpeciesChange={setSpeciesId}
          rankingType={rankingType}
        />
        {rankingType === 'unofficial' && !isRegional && IS_BRAG_UPLOAD_ENABLED && (
          <div className="ranking-brag-upload-inline">
            <span>사진만 올리면 자랑 랭킹에 참여할 수 있어요</span>
            <Link href="/upload/personal" className="ranking-brag-upload-btn">
              자랑 올리기
            </Link>
          </div>
        )}
        {rankingType === 'official' && !isRegional && (
          <CertificationGradeGuide variant="compact" className="ranking-grade-guide" />
        )}
      </header>

      {isRegional ? (
        <div className="ranking-regional-body">{children}</div>
      ) : (
        <div className="ranking-national-body">{children}</div>
      )}
    </div>
  );
}

export default function RankingShell({ children }: { children: React.ReactNode }) {
  return (
    <RankingFilterProvider>
      <Suspense fallback={null}>
        <RankingShellInner>{children}</RankingShellInner>
      </Suspense>
    </RankingFilterProvider>
  );
}
