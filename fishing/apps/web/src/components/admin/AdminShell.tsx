'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/admin', label: '대시보드', icon: '📊', exact: true },
  { href: '/admin/users', label: '회원 관리', icon: '👥' },
  { href: '/admin/rankings', label: '랭킹 관리', icon: '🏅' },
  { href: '/admin/reports', label: '신고 관리', icon: '🚨' },
  { href: '/admin/feedbacks', label: '피드백', icon: '💬' },
  { href: '/admin/catches', label: '기록 검수', icon: '✅' },
  { href: '/admin/comments', label: '댓글 관리', icon: '💭' },
  { href: '/admin/species', label: '어종 관리', icon: '🐟' },
  { href: '/admin/tournaments', label: '대회 관리', icon: '🏆' },
  { href: '/admin/tournament-entries', label: '대회 참가', icon: '🎫' },
  { href: '/admin/announcements', label: '공지·이벤트', icon: '📢' },
  { href: '/admin/posts', label: '게시글 관리', icon: '📝' },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-head">
          <Link href="/admin" className="admin-sidebar-title">FishRank Admin</Link>
          <span className="admin-sidebar-badge">관리자</span>
        </div>
        <nav className="admin-nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav-link${isActive(item.href, item.exact) ? ' active' : ''}`}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="admin-back-link">← 서비스로 돌아가기</Link>
      </aside>
      <div className="admin-content">{children}</div>
    </div>
  );
}
