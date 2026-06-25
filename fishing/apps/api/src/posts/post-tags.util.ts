/** API 내부 — packages/shared/community.constants.ts 와 동기화 */
export const COMMUNITY_TAG_KEYS = ['point', 'gear', 'catch', 'review', 'question', 'tip'] as const;

export type CommunityTagKey = (typeof COMMUNITY_TAG_KEYS)[number];
export type CommunitySort = 'latest' | 'popular';

export function isCommunityTagKey(key: string): key is CommunityTagKey {
  return (COMMUNITY_TAG_KEYS as readonly string[]).includes(key);
}

export function parseTagsInput(raw?: string | string[]): string[] {
  if (!raw) return [];

  const tokens: string[] = [];
  if (Array.isArray(raw)) {
    tokens.push(...raw);
  } else {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        tokens.push(...parsed.map(String));
      } else {
        tokens.push(trimmed);
      }
    } catch {
      tokens.push(...trimmed.split(',').map((s) => s.trim()));
    }
  }

  const unique = new Set<string>();
  for (const token of tokens) {
    if (isCommunityTagKey(token)) unique.add(token);
  }
  return [...unique];
}
