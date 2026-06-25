'use client';

import Link from 'next/link';
import UserAvatar from '@/components/ui/UserAvatar';

type Props = {
  nickname: string;
  profileImage?: string | null;
  size?: number;
};

export default function RankingUserAvatar({ nickname, profileImage, size = 36 }: Props) {
  return (
    <Link
      href={`/profile/${encodeURIComponent(nickname)}`}
      className="ranking-user-avatar"
      style={{ width: size, height: size }}
      aria-label={`${nickname} 프로필`}
    >
      <UserAvatar
        nickname={nickname}
        profileImage={profileImage}
        className="user-avatar-fill"
      />
    </Link>
  );
}
