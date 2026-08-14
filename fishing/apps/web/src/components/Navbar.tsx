'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useEffect, useState } from 'react';
import UserAvatar from '@/components/ui/UserAvatar';

const NAV_LINKS = [
  { href: '/', label: '홈', exact: true },
  { href: '/ranking', label: '랭킹' },
  { href: '/tournament', label: '대회' },
  { href: '/community', label: '커뮤니티' },
  { href: '/encyclopedia', label: '어종 사전' },
  { href: '/weather', label: '날씨' },
  { href: '/conditions', label: '출조·수위' },
  { href: '/fishing-info', label: '낚시 정보' },
];

export default function Navbar() {
  const { isLoggedIn, user, logout, updateUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data.data,
    enabled: isLoggedIn,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (me) updateUser(me);
  }, [me, updateUser]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const showAdmin = user?.role === 'admin' || me?.role === 'admin';
  const profileImage = me?.profileImage ?? user?.profileImage;

  const handleLogout = () => {
    logout();
    setDrawerOpen(false);
    router.push('/');
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const navLinkClass = (href: string, exact?: boolean) =>
    `${href.startsWith('/') && !exact ? 'site-nav-link' : 'site-nav-link'}${isActive(href, exact) ? ' active' : ''}`;

  const drawerLinkClass = (href: string, exact?: boolean) =>
    `site-nav-drawer-link${isActive(href, exact) ? ' active' : ''}`;

  return (
    <>
      <nav className={`site-nav${isHome ? ' site-nav-overlay' : ''}`}>
        <div className="site-nav-inner">
          <Link href="/" className="site-nav-logo">
            Fish<span>Rank</span>
          </Link>

          <div className="site-nav-menu site-nav-desktop-only">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={navLinkClass(link.href, link.exact)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="site-nav-actions">
            <div className="site-nav-actions-desktop site-nav-desktop-only">
              {isLoggedIn ? (
                <>
                  {showAdmin && (
                    <Link href="/admin" className="site-nav-btn-ghost">관리자</Link>
                  )}
                  {user?.nickname && (
                    <Link href="/my" className="site-nav-user">
                      <UserAvatar
                        nickname={user.nickname}
                        profileImage={profileImage}
                        className="site-nav-avatar"
                      />
                      <span className="site-nav-nickname">{user.nickname}</span>
                    </Link>
                  )}
                  <button type="button" onClick={handleLogout} className="site-nav-btn-ghost site-nav-logout-desktop">
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="site-nav-btn-ghost">로그인</Link>
                  <Link href="/auth/register" className="site-nav-btn-primary">회원가입</Link>
                </>
              )}
            </div>

            <div className="site-nav-mobile-only">
              {isLoggedIn && user?.nickname && (
                <Link href="/my" className="site-nav-user" aria-label="내 프로필">
                  <UserAvatar
                    nickname={user.nickname}
                    profileImage={profileImage}
                    className="site-nav-avatar"
                  />
                </Link>
              )}
              <button
                type="button"
                className={`site-nav-toggle${drawerOpen ? ' open' : ''}`}
                onClick={() => setDrawerOpen((v) => !v)}
                aria-expanded={drawerOpen}
                aria-controls="site-nav-drawer"
                aria-label={drawerOpen ? '메뉴 닫기' : '메뉴 열기'}
              >
                <span className="site-nav-toggle-icon" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div
        className={`site-nav-drawer-backdrop${drawerOpen ? ' open' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />

      <aside
        id="site-nav-drawer"
        className={`site-nav-drawer${drawerOpen ? ' open' : ''}`}
        aria-hidden={!drawerOpen}
      >
        <div className="site-nav-drawer-head">
          <Link href="/" className="site-nav-drawer-logo" onClick={() => setDrawerOpen(false)}>
            Fish<span>Rank</span>
          </Link>
          <button
            type="button"
            className="site-nav-drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="메뉴 닫기"
          >
            ✕
          </button>
        </div>

        <nav className="site-nav-drawer-links" aria-label="모바일 메뉴">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={drawerLinkClass(link.href, link.exact)}
              onClick={() => setDrawerOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {isLoggedIn && (
            <>
              <Link href="/my" className={drawerLinkClass('/my')} onClick={() => setDrawerOpen(false)}>
                내 프로필
              </Link>
              <Link href="/upload/personal" className="site-nav-drawer-link" onClick={() => setDrawerOpen(false)}>
                자랑 기록 올리기
              </Link>
              {showAdmin && (
                <Link href="/admin" className={drawerLinkClass('/admin')} onClick={() => setDrawerOpen(false)}>
                  관리자
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="site-nav-drawer-foot">
          {isLoggedIn ? (
            <>
              {user?.nickname && (
                <Link href="/my" className="site-nav-drawer-user" onClick={() => setDrawerOpen(false)}>
                  <UserAvatar
                    nickname={user.nickname}
                    profileImage={profileImage}
                    className="site-nav-avatar"
                  />
                  <span className="site-nav-drawer-user-name">{user.nickname}</span>
                </Link>
              )}
              <button type="button" className="site-nav-drawer-btn site-nav-drawer-btn-ghost" onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="site-nav-drawer-btn site-nav-drawer-btn-ghost" onClick={() => setDrawerOpen(false)}>
                로그인
              </Link>
              <Link href="/auth/register" className="site-nav-drawer-btn site-nav-drawer-btn-primary" onClick={() => setDrawerOpen(false)}>
                회원가입
              </Link>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
