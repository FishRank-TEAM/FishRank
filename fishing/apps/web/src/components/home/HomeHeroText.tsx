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
      <span className="site-section-label">{getWeekLabel()} · 주간 집계</span>
      <h1 className="home-hero-title">
        공정한 기록,
        <br />
        투명한 낚시 랭킹
      </h1>
      <p className="home-hero-desc">
        줄자 인증으로 남긴 기록이 전국·지역·어종별 순위에 반영됩니다.
        FishRank와 함께 실력을 데이터로 증명하세요.
      </p>
    </>
  );
}
