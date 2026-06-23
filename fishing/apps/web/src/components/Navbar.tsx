'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useEffect } from 'react';

const NAV_LINKS = [
  { href: '/', label: '홈', exact: true },
  { href: '/ranking', label: '랭킹' },
  { href: '/tournament', label: '대회' },
  { href: '/community', label: '커뮤니티' },
  { href: '/encyclopedia', label: '어종 사전' },
  { href: '/weather', label: '날씨' },
  { href: '/fishing-info', label: '낚시 정보' },
];

export default function Navbar() {
  const { isLoggedIn, user, logout, updateUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/';

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data.data,
    enabled: isLoggedIn,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (me) updateUser(me);
  }, [me, updateUser]);

  const showAdmin = user?.role === 'admin' || me?.role === 'admin';

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav className={`site-nav${isHome ? ' site-nav-overlay' : ''}`}>
      <div className="site-nav-inner">
        <Link href="/" className="site-nav-logo">
          Fish<span>Rank</span>
        </Link>

        <div className="site-nav-menu">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`site-nav-link${active ? ' active' : ''}`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="site-nav-actions">
          {isLoggedIn ? (
            <>
              {showAdmin && (
                <Link href="/admin" className="site-nav-btn-ghost">관리자</Link>
              )}
              {user?.nickname && (
                <Link href="/my" className="site-nav-user">
                  <span className="site-nav-avatar">{user.nickname[0]}</span>
                  <span className="site-nav-nickname">{user.nickname}</span>
                </Link>
              )}
              <button type="button" onClick={handleLogout} className="site-nav-btn-ghost">
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="site-nav-btn-ghost">
                로그인
              </Link>
              <Link href="/auth/register" className="site-nav-btn-primary">
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
