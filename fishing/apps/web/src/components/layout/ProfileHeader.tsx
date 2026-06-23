import type { ReactNode } from 'react';

type Props = {
  nickname: string;
  subtitle?: string;
  badges?: ReactNode;
  avatar?: ReactNode;
  actions?: ReactNode;
};

export default function ProfileHeader({ nickname, subtitle, badges, avatar, actions }: Props) {
  return (
    <header className="profile-header">
      <div className="site-container profile-header-inner">
        <div className="profile-header-main">
          <div className="profile-header-avatar">
            {avatar ?? nickname[0]}
          </div>
          <div>
            <h1 className="profile-header-name">{nickname}</h1>
            {subtitle && <p className="profile-header-sub">{subtitle}</p>}
            {badges && <div className="profile-header-badges">{badges}</div>}
          </div>
        </div>
        {actions}
      </div>
    </header>
  );
}

export function ProfileStatsBar({ items }: { items: { value: ReactNode; label: string }[] }) {
  return (
    <div className="profile-stats">
      <div className="site-container profile-stats-inner">
        {items.map((item) => (
          <div key={item.label} className="profile-stat">
            <span className="profile-stat-value">{item.value}</span>
            <span className="profile-stat-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
