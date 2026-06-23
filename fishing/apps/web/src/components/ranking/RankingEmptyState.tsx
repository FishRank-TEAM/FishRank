import Link from 'next/link';
import { isUploadPathEnabled } from '@/lib/platform';

type Props = {
  icon?: string;
  title: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
  compact?: boolean;
};

export default function RankingEmptyState({
  icon = '🎣',
  title,
  description,
  ctaHref = '/upload',
  ctaLabel = '첫 기록 남기기',
  compact = false,
}: Props) {
  return (
    <div className={`ranking-empty-state${compact ? ' ranking-empty-state-compact' : ''}`}>
      <div className="ranking-empty-state-icon" aria-hidden>
        {icon}
      </div>
      <p className="ranking-empty-state-title">{title}</p>
      {description && <p className="ranking-empty-state-desc">{description}</p>}
      {isUploadPathEnabled(ctaHref) ? (
        <Link href={ctaHref} className="ranking-empty-state-cta">
          {ctaLabel}
        </Link>
      ) : (
        <p className="ranking-empty-state-hint">
          {ctaHref.includes('/personal')
            ? '자랑 기록 업로드는 현재 이용할 수 없습니다'
            : '줄자 인증 업로드는 모바일 앱에서 가능합니다'}
        </p>
      )}
    </div>
  );
}
