type Props = {
  icon?: string;
  message?: string;
  compact?: boolean;
};

export default function SiteLoadingState({
  icon = '🎣',
  message = '불러오는 중...',
  compact = false,
}: Props) {
  return (
    <div className={`site-state site-state-loading${compact ? ' site-state-compact' : ''}`} role="status" aria-live="polite">
      <div className="site-state-icon" aria-hidden>{icon}</div>
      <p className="site-state-title">{message}</p>
    </div>
  );
}
