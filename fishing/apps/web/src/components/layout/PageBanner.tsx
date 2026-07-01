import { cn } from '@/lib/utils';

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
};

export default function PageBanner({ title, description, action, className, fullWidth }: Props) {
  if (fullWidth) {
    return (
      <div className={cn('w-full bg-[#0A2540] px-10 py-8', className)}>
        <div
          className={cn(
            action && 'flex items-center justify-between gap-4',
          )}
        >
          <div>
            <h1 className="mb-1 text-xl font-bold text-white">{title}</h1>
            {description && <p className="text-sm text-white/55">{description}</p>}
          </div>
          {action}
        </div>
      </div>
    );
  }

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
