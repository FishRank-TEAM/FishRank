import Link from 'next/link';
import type { ReactNode } from 'react';

type Props = {
  icon?: string;
  title: string;
  description?: string;
  compact?: boolean;
  action?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
};

export default function SiteEmptyState({
  icon = '📭',
  title,
  description,
  compact = false,
  action,
  actionHref,
  actionLabel,
}: Props) {
  return (
    <div className={`site-state${compact ? ' site-state-compact' : ''}`} role="status">
      <div className="site-state-icon" aria-hidden>{icon}</div>
      <p className="site-state-title">{title}</p>
      {description && <p className="site-state-desc">{description}</p>}
      {(action || actionHref) && (
        <div className="site-state-actions">
          {action ?? (
            actionHref && actionLabel ? (
              <Link href={actionHref} className="site-btn site-btn-primary">
                {actionLabel}
              </Link>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
