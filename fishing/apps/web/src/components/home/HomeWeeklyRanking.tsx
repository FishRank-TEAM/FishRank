'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { HomeRankingItem } from '@/lib/server-api';
import { formatLength, formatTimeAgo } from '@/lib/utils';
import { IS_BRAG_UPLOAD_ENABLED } from '@/lib/platform';
import UserAvatar from '@/components/ui/UserAvatar';

type PeriodKey = 'weekly' | 'alltime';

type Props = {
  rankings: HomeRankingItem[];
  alltimeRankings?: HomeRankingItem[];
};

const ROTATE_MS = 8000;
const FADE_MS = 220;

const PERIOD_META: Record<PeriodKey, { title: string; meta: string; href: string }> = {
  weekly: {
    title: '주간 랭킹',
    meta: '인증 기록 · 최근 7일 · rank_score 기준',
    href: '/ranking?period=weekly',
  },
  alltime: {
    title: '역대 기록',
    meta: '인증 기록 · 전체 기간 · rank_score 기준',
    href: '/ranking?period=alltime',
  },
};

const PERIODS: PeriodKey[] = ['weekly', 'alltime'];

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return <span className={`home-rank-badge home-rank-badge-${rank}`}>{rank}</span>;
  }
  return <span className="home-rank-num">{rank}</span>;
}

export default function HomeWeeklyRanking({ rankings, alltimeRankings = [] }: Props) {
  const rowsByPeriod: Record<PeriodKey, HomeRankingItem[]> = {
    weekly: rankings,
    alltime: alltimeRankings,
  };

  const canRotate = rankings.length > 0 || alltimeRankings.length > 0;
  const startPeriod: PeriodKey =
    rankings.length > 0 && rankings.length < 4 && alltimeRankings.length > rankings.length
      ? 'alltime'
      : rankings.length > 0
        ? 'weekly'
        : 'alltime';

  const [period, setPeriod] = useState<PeriodKey>(startPeriod);
  const [visible, setVisible] = useState(true);
  const [cycle, setCycle] = useState(0);

  const switchTo = (next: PeriodKey) => {
    setVisible(false);
    window.setTimeout(() => {
      setPeriod(next);
      setVisible(true);
      setCycle((c) => c + 1);
    }, FADE_MS);
  };

  useEffect(() => {
    setPeriod(startPeriod);
    setCycle((c) => c + 1);
  }, [startPeriod]);

  const rows = rowsByPeriod[period];
  const meta = PERIOD_META[period];
  const nextPeriod: PeriodKey = period === 'weekly' ? 'alltime' : 'weekly';

  return (
    <section className="home-section">
      <div className="home-section-head">
        <div>
          <h2 className="home-section-title">{meta.title}</h2>
          <p className="home-section-meta">{meta.meta}</p>
        </div>
        <div className="home-section-links">
          <Link href="/ranking/regional" className="home-link">지역별</Link>
          <Link href={meta.href} className="home-link home-link-primary">전체 보기</Link>
        </div>
      </div>

      <div className="home-ranking-switch">
        <div className="home-ranking-period-tabs" role="tablist" aria-label="랭킹 기간">
          {PERIODS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={period === key}
              className={`home-ranking-period-tab${period === key ? ' active' : ''}`}
              onClick={() => switchTo(key)}
            >
              {PERIOD_META[key].title}
              <span className="home-ranking-period-count">{rowsByPeriod[key].length}</span>
            </button>
          ))}
        </div>
        {canRotate && (
          <p className="home-ranking-next-hint">
            다음: {PERIOD_META[nextPeriod].title}
          </p>
        )}
      </div>

      {canRotate && (
        <div
          className="home-ranking-progress"
          role="progressbar"
          aria-label={`${PERIOD_META[nextPeriod].title}로 전환까지`}
        >
          <div
            key={cycle}
            className="home-ranking-progress-bar"
            style={{ animationDuration: `${ROTATE_MS}ms` }}
            onAnimationEnd={() => switchTo(nextPeriod)}
          />
        </div>
      )}

      <div className={`home-ranking-rotate${visible ? ' visible' : ''}`}>
        {rows.length === 0 ? (
          <div className="home-empty">
            <p>
              {period === 'weekly'
                ? '이번 주 인증 기록이 아직 없어요. 잠시 후 역대 기록이 이어집니다.'
                : '등록된 인증 기록이 아직 없어요.'}
            </p>
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
                {rows.map((item) => (
                  <tr key={`${period}-${item.catch.id}`} className={item.rank === 1 ? 'home-ranking-top' : ''}>
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
      </div>
    </section>
  );
}
