import Link from 'next/link';
import type { HomeRankingItem } from '@/lib/server-api';
import { formatLength, formatTimeAgo } from '@/lib/utils';
import { IS_BRAG_UPLOAD_ENABLED } from '@/lib/platform';
import UserAvatar from '@/components/ui/UserAvatar';

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
          <p>이번 주 인증 기록이 아직 없어요.</p>
          <p className="home-empty-sub">앱에서 줄자 인증하면 여기에 표시돼요.</p>
          <div className="home-empty-actions">
            {IS_BRAG_UPLOAD_ENABLED && (
              <Link href="/upload/personal" className="site-btn site-btn-primary">
                웹에서 자랑 올리기
              </Link>
            )}
            <Link href="/ranking" className="site-btn site-btn-ghost">
              랭킹 보기
            </Link>
          </div>
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
                      <UserAvatar
                        nickname={item.user.nickname}
                        profileImage={item.user.profileImage}
                        className="home-avatar"
                      />
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
