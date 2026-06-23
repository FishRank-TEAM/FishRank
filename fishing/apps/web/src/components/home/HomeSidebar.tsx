import Link from 'next/link';
import type { HomeAnnouncement, HomePost, HomeTournament } from '@/lib/server-api';
import { formatTimeAgo } from '@/lib/utils';
import WeatherWidget from '@/components/WeatherWidget';

type Props = {
  tournaments: HomeTournament[];
  posts: HomePost[];
  announcements?: HomeAnnouncement[];
};

function formatPrize(t: HomeTournament) {
  if (t.prizeAmount != null) return `${Number(t.prizeAmount).toLocaleString()}원`;
  if (t.prize) return t.prize;
  return '상금 미정';
}

function formatDeadline(endAt: string) {
  const d = new Date(endAt);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 마감`;
}

export default function HomeSidebar({ tournaments, posts, announcements = [] }: Props) {
  const active = tournaments[0];

  return (
    <aside className="home-sidebar">
      {announcements.length > 0 && (
        <section className="home-panel home-panel-announce">
          <div className="home-panel-head">
            <h3 className="home-panel-title">공지·이벤트</h3>
          </div>
          <ul className="home-announce-list">
            {announcements.map((item) => (
              <li key={item.id}>
                {item.linkUrl ? (
                  <a href={item.linkUrl} className="home-announce-item" target="_blank" rel="noreferrer">
                    <span className={`home-announce-type ${item.type}`}>{item.type === 'event' ? '이벤트' : '공지'}</span>
                    <strong>{item.title}</strong>
                  </a>
                ) : (
                  <div className="home-announce-item">
                    <span className={`home-announce-type ${item.type}`}>{item.type === 'event' ? '이벤트' : '공지'}</span>
                    <strong>{item.title}</strong>
                    <p>{item.content.length > 80 ? `${item.content.slice(0, 80)}…` : item.content}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="home-panel">
        <div className="home-panel-head">
          <h3 className="home-panel-title">오늘 낚시 날씨</h3>
          <Link href="/weather" className="home-link">상세</Link>
        </div>
        <WeatherWidget compact />
      </section>

      <section className="home-panel">
        <h3 className="home-panel-title">진행 중인 대회</h3>
        {active ? (
          <>
            <Link href={`/tournament/${active.id}`} className="home-tournament-card">
              <span className="home-tournament-status">모집·진행 중</span>
              <strong className="home-tournament-name">{active.title}</strong>
              <span className="home-tournament-prize">{formatPrize(active)}</span>
              <span className="home-tournament-meta">
                {active._count?.entries ?? 0}명 참가 · {formatDeadline(active.endAt)}
              </span>
            </Link>
            <Link href="/tournament" className="home-panel-more">대회 목록</Link>
          </>
        ) : (
          <p className="home-panel-empty">진행 중인 대회가 없습니다.</p>
        )}
      </section>

      <section className="home-panel">
        <div className="home-panel-head">
          <h3 className="home-panel-title">커뮤니티</h3>
          <Link href="/community" className="home-link">더보기</Link>
        </div>
        {posts.length === 0 ? (
          <p className="home-panel-empty">등록된 글이 없습니다.</p>
        ) : (
          <ul className="home-post-list">
            {posts.map((post) => (
              <li key={post.id}>
                <Link href={`/community/${post.id}`} className="home-post-item">
                  <span className="home-post-title">{post.title}</span>
                  <span className="home-post-meta">
                    {post.user.nickname} · {formatTimeAgo(post.createdAt)}
                    {post._count?.comments ? ` · 댓글 ${post._count.comments}` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="home-panel home-panel-muted">
        <h3 className="home-panel-title">바로가기</h3>
        <nav className="home-quick-nav">
          <Link href="/ranking">전국 랭킹</Link>
          <Link href="/ranking/regional">지역별 랭킹</Link>
          <Link href="/encyclopedia">어종 사전</Link>
          <Link href="/weather">낚시 날씨</Link>
          <Link href="/fishing-info">낚시 정보</Link>
        </nav>
      </section>
    </aside>
  );
}
