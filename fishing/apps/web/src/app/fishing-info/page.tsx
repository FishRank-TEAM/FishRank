import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import { KNOTS, KNOT_DIFFICULTY_LABEL, getDifficultyBadgeClass } from '@/data/knots';

const FEATURED_KNOTS = KNOTS.slice(0, 4);

const FORBIDDEN_ZONES_INFO = [
  { icon: '🚫', title: '금지 구역 확인 방법', desc: '국립공원, 보호구역, 상수원 보호구역은 낚시 금지. 환경부 자연환경정보 시스템(nie.go.kr)에서 확인 가능.' },
  { icon: '⚖️', title: '법정 금지 어종', desc: '황쏘가리, 흰수마자, 감돌고기 등 천연기념물 및 멸종위기종은 포획 금지. 어기면 최대 5년 이하 징역 또는 5천만원 이하 벌금.' },
  { icon: '📏', title: '최소 포획 사이즈', desc: '광어 35cm, 참돔 24cm, 감성돔 25cm 미만은 방생 의무. 어종 사전에서 각 어종의 법적 최소 사이즈 확인 가능.' },
  { icon: '🗓', title: '금어기', desc: '어종별 산란기에는 포획 금지. 수산자원관리법 및 내수면어업법 확인 필수. 위반 시 과태료 부과.' },
];

const SAFETY_TIPS = [
  { icon: '🦺', tip: '구명조끼 착용 (선상, 카약, 갯바위 필수)' },
  { icon: '☀️', tip: '여름철 자외선 차단제 및 모자 착용' },
  { icon: '⛈️', tip: '번개 예보 시 즉시 철수' },
  { icon: '🐍', tip: '풀숲 주의 (뱀, 진드기)' },
  { icon: '📱', tip: '낚시 전 가족에게 위치 공유' },
  { icon: '🚗', tip: '음주 낚시 후 대리운전 이용' },
];

export default function FishingInfoPage() {
  return (
    <main>
      <PageHeader
        title="낚시 정보"
        description="낚시 매듭 · 금지구역 · 안전 수칙"
      />

      <div className="site-container site-page-body info-page-grid">
        <div>
          <section className="info-section">
            <div className="info-section-head">
              <h2 className="info-section-title">🪢 낚시 매듭 가이드</h2>
              <Link href="/fishing-info/knots" className="site-btn-sm">
                전체 {KNOTS.length}개 보기 →
              </Link>
            </div>
            <div className="knot-preview-grid">
              {FEATURED_KNOTS.map((knot) => (
                <Link key={knot.slug} href={`/fishing-info/knots/${knot.slug}`} className="knot-preview-link">
                  <div className="knot-preview-card">
                    <div className="knot-preview-icon">{knot.icon}</div>
                    <div className="knot-preview-body">
                      <div className="knot-card-name">{knot.nameKo}</div>
                      <div className="knot-card-usage">{knot.summary}</div>
                      <span className={`site-badge ${getDifficultyBadgeClass(knot.difficulty)}`}>
                        {KNOT_DIFFICULTY_LABEL[knot.difficulty]}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="info-section">
            <h2 className="info-section-title">🚫 낚시 금지구역 &amp; 법규</h2>
            <div className="forbidden-grid">
              {FORBIDDEN_ZONES_INFO.map((item) => (
                <div key={item.title} className="info-tip-card">
                  <div className="info-tip-card-icon">{item.icon}</div>
                  <div className="info-tip-card-title">{item.title}</div>
                  <p className="info-tip-card-desc">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="info-callout">
              💡 상세한 법적 내용은 <strong>국가법령정보센터 (law.go.kr)</strong>의 &quot;수산자원관리법&quot;, &quot;내수면어업법&quot;을 참조하세요.
            </div>
          </section>

          <section className="info-section">
            <h2 className="info-section-title">⛑️ 낚시 안전 수칙</h2>
            <div className="safety-grid">
              {SAFETY_TIPS.map((tip) => (
                <div key={tip.tip} className="safety-tip">
                  <span className="safety-tip-icon">{tip.icon}</span>
                  {tip.tip}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside>
          <div className="sidebar-card">
            <h4 className="sidebar-card-title">빠른 링크</h4>
            {[
              { href: '/weather', label: '🌤 날씨 상세 보기' },
              { href: '/encyclopedia', label: '🐟 어종 사전 보기' },
              { href: '/ranking', label: '🏆 랭킹 확인' },
              { href: '/tournament', label: '🏅 대회 참가' },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="sidebar-link">
                {link.label}
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
