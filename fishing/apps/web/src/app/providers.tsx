'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import AuthBootstrap from '@/components/AuthBootstrap';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap />
      <div className="site-shell">
        <Navbar />
        <div className="site-main">{children}</div>
        <SiteFooter />
      </div>
    </QueryClientProvider>
  );
}
