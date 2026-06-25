/** 커뮤니티 게시글 태그 — API · 앱 · 웹 공통 */
export const COMMUNITY_TAGS = [
  { key: 'point', label: '포인트' },
  { key: 'gear', label: '장비' },
  { key: 'catch', label: '조황' },
  { key: 'review', label: '후기' },
  { key: 'question', label: '질문' },
  { key: 'tip', label: '팁' },
] as const;

export type CommunityTagKey = (typeof COMMUNITY_TAGS)[number]['key'];
export type CommunitySort = 'latest' | 'popular';

export const COMMUNITY_TAG_KEYS = COMMUNITY_TAGS.map((t) => t.key) as CommunityTagKey[];

export function getCommunityTagLabel(key: string): string {
  return COMMUNITY_TAGS.find((t) => t.key === key)?.label ?? key;
}

export function isCommunityTagKey(key: string): key is CommunityTagKey {
  return (COMMUNITY_TAG_KEYS as readonly string[]).includes(key);
}
