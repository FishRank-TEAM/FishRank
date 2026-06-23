'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const RANKING_TABS = [
  { href: '/ranking', label: '전국' },
  { href: '/ranking/regional', label: '지역별' },
];

export default function RankingTabs() {
  const pathname = usePathname();

  return (
    <nav className="ranking-subtabs" aria-label="랭킹 범위">
      {RANKING_TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            scroll={false}
            className={`ranking-subtab${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
