import { cn } from '@/lib/utils';

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export default function PageBanner({ title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        'mb-5 flex items-center justify-between gap-4 rounded-xl bg-[#0A2540] px-6 py-5',
        className,
      )}
    >
      <div>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-white/60">{description}</p>}
      </div>
      {action}
    </div>
  );
}
