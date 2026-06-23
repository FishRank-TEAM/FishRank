import { formatTimeAgo } from '@/lib/utils';

type Props = {
  locationName?: string;
  createdAt: string;
  className?: string;
};

export default function RankingLocationMeta({
  locationName,
  createdAt,
  className = 'ranking-row-meta',
}: Props) {
  const text = [locationName, formatTimeAgo(createdAt)].filter(Boolean).join(' · ');
  return <p className={className}>{text}</p>;
}
