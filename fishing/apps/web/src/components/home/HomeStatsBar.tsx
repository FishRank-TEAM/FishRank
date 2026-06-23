import type { HomeRankingItem, HomeTournament } from '@/lib/server-api';
import { formatLength } from '@/lib/utils';

type Props = {
  rankings: HomeRankingItem[];
  tournaments: HomeTournament[];
};

export default function HomeStatsBar({ rankings, tournaments }: Props) {
  const top = rankings[0];
  const tournamentEntries = tournaments.reduce(
    (sum, t) => sum + (t._count?.entries ?? 0),
    0,
  );

  const items = [
    {
      value: top?.user.nickname ?? '–',
      label: '이번주 1위',
      isText: true,
    },
    {
      value: top ? formatLength(top.lengthCm) : '–',
      label: '주간 최장 기록',
    },
    {
      value: top?.fishSpecies?.nameKo ?? '–',
      label: '1위 어종',
      isText: true,
    },
    {
      value: tournaments.length > 0 ? `${tournaments.length}건` : '–',
      label: tournamentEntries > 0 ? `진행 중 대회 · ${tournamentEntries}명 참가` : '진행 중 대회',
    },
  ];

  return (
    <section className="home-stats">
      <div className="home-container home-stats-inner">
        {items.map((item) => (
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
