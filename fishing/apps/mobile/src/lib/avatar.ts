import { colors } from '@/theme/colors';

const PALETTE = [
  colors.brandGreen,
  colors.brandNavy,
  '#2a6e4a',
  '#3d7a99',
  '#5c6bc0',
  '#8d6e63',
] as const;

export function getAvatarInitials(nickname: string): string {
  const trimmed = nickname.trim();
  if (trimmed.length >= 2) return trimmed.slice(-2);
  return trimmed.charAt(0).toUpperCase() || '?';
}

export function getNicknameColor(nickname: string): string {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 3) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 3)}****@${domain}`;
}
