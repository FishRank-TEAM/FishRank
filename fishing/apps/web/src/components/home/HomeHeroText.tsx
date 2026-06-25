import { HOME_HERO_DESC } from '@/lib/platform';

function getWeekLabel() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function HomeHeroText() {
  return (
    <>
      <span className="site-section-label">{getWeekLabel()} 주간 랭킹</span>
      <h1 className="home-hero-title">
        이번 주 잡은 물고기,
        <br />
        전국 몇 위?
      </h1>
      <p className="home-hero-desc">{HOME_HERO_DESC}</p>
    </>
  );
}
