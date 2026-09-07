const STORAGE_KEY = 'fishrank.conditions.recentCounties';
const MAX = 6;

export function loadRecentCounties(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map((v) => v.trim())
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function pushRecentCounty(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed || typeof window === 'undefined') return loadRecentCounties();
  const next = [trimmed, ...loadRecentCounties().filter((v) => v !== trimmed)].slice(0, MAX);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}
