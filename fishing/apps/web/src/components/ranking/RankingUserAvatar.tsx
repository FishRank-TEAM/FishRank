'use client';

import Link from 'next/link';
import { getImageUrl } from '@/lib/images';

type Props = {
  nickname: string;
  profileImage?: string | null;
  size?: number;
};

export default function RankingUserAvatar({ nickname, profileImage, size = 36 }: Props) {
  const src = profileImage ? getImageUrl(profileImage) : null;

  return (
    <Link
      href={`/profile/${encodeURIComponent(nickname)}`}
      className="ranking-user-avatar"
      style={{ width: size, height: size }}
      aria-label={`${nickname} 프로필`}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" />
      ) : (
        <span aria-hidden>{nickname[0]?.toUpperCase() ?? '?'}</span>
      )}
    </Link>
  );
}
