import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'FishRank — 낚시 랭킹 & 대회',
  description: '줄자 인증으로 기록을 남기고, 어종별 랭킹과 대회에서 실력을 겨루는 낚시 플랫폼.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
