import { getCommunityTagLabel } from '@fishrank/shared';
import { cn } from '@/lib/utils';

const TAG_BADGE_STYLES: Record<string, string> = {
  catch: 'bg-green-50 text-green-700',
  review: 'bg-blue-50 text-blue-700',
  gear: 'bg-amber-50 text-amber-700',
  question: 'bg-purple-50 text-purple-700',
  point: 'bg-slate-50 text-slate-600',
  tip: 'bg-slate-50 text-slate-600',
};

type Props = {
  tags?: string[];
  max?: number;
  className?: string;
};

export default function PostTagBadges({ tags, max = 3, className }: Props) {
  if (!tags?.length) return null;
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {tags.slice(0, max).map((tag) => (
        <span
          key={tag}
          className={cn(
            'text-[11px] font-semibold px-2 py-0.5 rounded',
            TAG_BADGE_STYLES[tag] ?? 'bg-slate-50 text-slate-600',
          )}
        >
          {getCommunityTagLabel(tag)}
        </span>
      ))}
    </div>
  );
}
