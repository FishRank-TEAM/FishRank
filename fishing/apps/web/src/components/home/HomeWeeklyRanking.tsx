import Link from 'next/link';
import type { HomeRankingItem } from '@/lib/server-api';
import { getImageUrl } from '@/lib/images';
import { formatLength, formatTimeAgo } from '@/lib/utils';

type Props = {
  rankings: HomeRankingItem[];
};

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return <span className={`home-rank-badge home-rank-badge-${rank}`}>{rank}</span>;
  }
  return <span className="home-rank-num">{rank}</span>;
}

export default function HomeWeeklyRanking({ rankings }: Props) {
  return (
    <section className="home-section">
      <div className="home-section-head">
        <div>
          <h2 className="home-section-title">주간 랭킹</h2>
          <p className="home-section-meta">인증 기록 · 최근 7일 · rank_score 기준</p>
        </div>
        <div className="home-section-links">
          <Link href="/ranking/regional" className="home-link">지역별</Link>
          <Link href="/ranking" className="home-link home-link-primary">전체 보기</Link>
        </div>
      </div>

      {rankings.length === 0 ? (
        <div className="home-empty">
          <p>아직 이번 주 인증 기록이 없습니다.</p>
          <p className="home-empty-sub">공식 인증은 모바일 앱(AR+AI)에서 촬영하면 랭킹에 표시됩니다.</p>
        </div>
      ) : (
        <div className="home-ranking-table-wrap">
          <table className="home-ranking-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>낚시인</th>
                <th>어종</th>
                <th>기록</th>
                <th className="home-hide-sm">장소</th>
                <th className="home-hide-sm">등록</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((item) => (
                <tr key={item.catch.id} className={item.rank === 1 ? 'home-ranking-top' : ''}>
                  <td><RankBadge rank={item.rank} /></td>
                  <td>
                    <Link href={`/profile/${encodeURIComponent(item.user.nickname)}`} className="home-user-cell">
                      <span className="home-avatar">
                        {item.user.profileImage ? (
                          <img src={getImageUrl(item.user.profileImage)!} alt="" />
                        ) : (
                          item.user.nickname[0]
                        )}
                      </span>
                      <span className="home-nickname">{item.user.nickname}</span>
                    </Link>
                  </td>
                  <td>
                    <span className="home-tag">{item.fishSpecies?.nameKo ?? '–'}</span>
                  </td>
                  <td>
                    <span className="home-length">{formatLength(item.lengthCm)}</span>
                    {item.grade && (
                      <span className="home-grade">{item.grade}</span>
                    )}
                  </td>
                  <td className="home-hide-sm home-muted">
                    {item.catch.locationName ?? '–'}
                  </td>
                  <td className="home-hide-sm home-muted">
                    {formatTimeAgo(item.catch.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
