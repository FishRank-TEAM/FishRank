import Link from 'next/link';
import type { ReactNode } from 'react';

type Props = {
  icon?: string;
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
};

export default function SiteErrorState({
  icon = '😕',
  title = '데이터를 불러오지 못했습니다',
  description = '잠시 후 다시 시도해 주세요.',
  retryLabel = '다시 시도',
  onRetry,
  backHref = '/',
  backLabel = '홈으로',
  action,
}: Props) {
  return (
    <div className="site-state site-state-error" role="alert">
      <div className="site-state-icon" aria-hidden>{icon}</div>
      <p className="site-state-title">{title}</p>
      <p className="site-state-desc">{description}</p>
      <div className="site-state-actions">
        {action}
        {onRetry && (
          <button type="button" className="site-btn site-btn-primary" onClick={onRetry}>
            {retryLabel}
          </button>
        )}
        {backHref && (
          <Link href={backHref} className="site-btn site-btn-ghost">
            {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
