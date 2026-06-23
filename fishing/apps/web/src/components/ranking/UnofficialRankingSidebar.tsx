'use client';

import BragEvaluateFeed from './BragEvaluateFeed';
import BragTopUsersMarquee from './BragTopUsersMarquee';
import type { RankingItem } from '@/components/RankingCard';

type Props = {
  topItems: RankingItem[];
};

export default function UnofficialRankingSidebar({ topItems }: Props) {
  return (
    <aside className="brag-sidebar">
      <BragTopUsersMarquee items={topItems} />
      <BragEvaluateFeed />
    </aside>
  );
}
