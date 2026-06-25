import { getImageUrl } from '@/lib/images';
import { getAvatarInitials, getNicknameColor } from '@/lib/avatar';

type Props = {
  nickname: string;
  profileImage?: string | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

export default function UserAvatar({
  nickname,
  profileImage,
  size,
  className,
  style,
}: Props) {
  const src = profileImage ? getImageUrl(profileImage) : null;
  const initials = getAvatarInitials(nickname);

  const mergedStyle: React.CSSProperties = {
    ...(size ? { width: size, height: size } : {}),
    ...(!src ? { backgroundColor: getNicknameColor(nickname) } : {}),
    ...style,
  };

  return (
    <span className={className} style={mergedStyle} aria-hidden>
      {src ? <img src={src} alt="" loading="lazy" /> : initials}
    </span>
  );
}
