import RankingShell from '@/components/ranking/RankingShell';

export default function RankingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://dapi.kakao.com" crossOrigin="" />
      <link rel="dns-prefetch" href="https://dapi.kakao.com" />
      <main className="ranking-layout">
        <RankingShell>{children}</RankingShell>
      </main>
    </>
  );
}
