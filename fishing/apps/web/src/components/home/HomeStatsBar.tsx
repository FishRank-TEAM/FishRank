import type { HomeRankingItem, HomeSpeciesSpotlight, HomeTournament } from '@/lib/server-api';
import { formatLength } from '@/lib/utils';
import HomeSpeciesRotate from './HomeSpeciesRotate';

type Props = {
  rankings: HomeRankingItem[];
  alltimeRankings?: HomeRankingItem[];
  tournaments: HomeTournament[];
  speciesSpotlight?: HomeSpeciesSpotlight;
};

export default function HomeStatsBar({
  rankings,
  alltimeRankings = [],
  tournaments,
  speciesSpotlight,
}: Props) {
  const weeklyTop = rankings[0];
  const alltimeTop = alltimeRankings[0];
  const useAlltime = !weeklyTop && !!alltimeTop;
  const top = weeklyTop ?? alltimeTop;
  const spotlight = speciesSpotlight ?? {
    topRankSpecies: top?.fishSpecies?.nameKo ?? null,
    popularSpecies: null,
    popularCatchCount: 0,
  };
  const tournamentEntries = tournaments.reduce(
    (sum, t) => sum + (t._count?.entries ?? 0),
    0,
  );

  const fixedItems = [
    {
      value: top?.user.nickname ?? '–',
      label: useAlltime ? '역대 1위' : '이번주 1위',
      isText: true,
    },
    {
      value: top ? formatLength(top.lengthCm) : '–',
      label: useAlltime ? '역대 최장 기록' : '주간 최장 기록',
    },
    {
      value: tournaments.length > 0 ? `${tournaments.length}건` : '–',
      label: tournamentEntries > 0 ? `진행 중 대회 · ${tournamentEntries}명 참가` : '진행 중 대회',
    },
  ];

  return (
    <section className="home-stats">
      <div className="home-container home-stats-inner">
        {fixedItems.slice(0, 2).map((item) => (
          <div key={item.label} className="home-stat">
            <span className={`home-stat-value${item.isText ? ' home-stat-value-text' : ''}`}>
              {item.value}
            </span>
            <span className="home-stat-label">{item.label}</span>
          </div>
        ))}
        <HomeSpeciesRotate spotlight={spotlight} />
        {fixedItems.slice(2).map((item) => (
          <div key={item.label} className="home-stat">
            <span className={`home-stat-value${item.isText ? ' home-stat-value-text' : ''}`}>
              {item.value}
            </span>
            <span className="home-stat-label">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
