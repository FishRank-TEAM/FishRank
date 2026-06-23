import Link from 'next/link';

const FOOTER_LINKS = [
  {
    title: '랭킹',
    links: [
      { href: '/ranking', label: '전국 랭킹' },
      { href: '/ranking/regional', label: '지역별 랭킹' },
    ],
  },
  {
    title: '서비스',
    links: [
      { href: '/tournament', label: '대회' },
      { href: '/community', label: '커뮤니티' },
      { href: '/encyclopedia', label: '어종 사전' },
      { href: '/weather', label: '낚시 날씨' },
      { href: '/fishing-info', label: '낚시 정보' },
    ],
  },
  {
    title: '계정',
    links: [
      { href: '/auth/login', label: '로그인' },
      { href: '/auth/register', label: '회원가입' },
      { href: '/my', label: '내 프로필' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container site-footer-top">
        <div className="site-footer-brand">
          <Link href="/" className="site-footer-logo">
            Fish<span>Rank</span>
          </Link>
          <p className="site-footer-tagline">
            건강한 기록, 공정한 순위
            <br />
            줄자 인증 기반 낚시 랭킹·대회 플랫폼
          </p>
        </div>
        <div className="site-footer-columns">
          {FOOTER_LINKS.map((col) => (
            <div key={col.title} className="site-footer-col">
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="site-footer-bottom">
        <div className="site-container site-footer-bottom-inner">
          <p>© {new Date().getFullYear()} FishRank. All rights reserved.</p>
          <a href="mailto:qkrrjsgud49@gmail.com" className="site-footer-email">
            qkrrjsgud49@gmail.com
          </a>
          <p className="site-footer-note">기록 업로드는 모바일 앱에서 제공됩니다.</p>
        </div>
      </div>
    </footer>
  );
}
