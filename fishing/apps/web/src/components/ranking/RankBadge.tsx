import { getRankBadgeClass } from '@/lib/ranking-badges';

type Props = {
  rank: number;
  className?: string;
};

export default function RankBadge({ rank, className = '' }: Props) {
  return (
    <span className={`${getRankBadgeClass(rank)}${className ? ` ${className}` : ''}`} aria-label={`${rank}위`}>
      {rank}
    </span>
  );
}
