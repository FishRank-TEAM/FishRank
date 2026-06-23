'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import AdminShell from '@/components/admin/AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoggedIn, updateUser } = useAuthStore();

  const { data: me, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data.data,
    enabled: isLoggedIn,
    retry: false,
  });

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/auth/login');
    }
  }, [isLoggedIn, router]);

  useEffect(() => {
    if (me) updateUser(me);
  }, [me, updateUser]);

  useEffect(() => {
    if (!isLoading && me && me.role !== 'admin') {
      router.replace('/');
    }
  }, [isLoading, me, router]);

  if (!isLoggedIn || isLoading) {
    return <div className="admin-loading">관리자 페이지 확인 중...</div>;
  }

  if (isError || me?.role !== 'admin') {
    return null;
  }

  return <AdminShell>{children}</AdminShell>;
}
