const PALETTE = ['#0077b6', '#003d6b', '#2a9d8f', '#5c6bc0', '#8d6e63', '#3d7a99'] as const;

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
