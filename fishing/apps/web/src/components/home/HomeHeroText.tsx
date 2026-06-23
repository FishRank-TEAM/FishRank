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
      <p className="home-hero-desc">
        줄자 인증하고 올리면 전국·지역·어종 순위에 바로 반영됩니다.
        매주 월요일 집계가 새로 시작됩니다.
      </p>
    </>
  );
}
