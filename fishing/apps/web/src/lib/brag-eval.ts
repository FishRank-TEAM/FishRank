const STORAGE_KEY = 'brag-evaluated-ids';

export function getEvaluatedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function markEvaluated(catchId: string) {
  const set = getEvaluatedIds();
  set.add(catchId);
  const ids = [...set].slice(-300);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}
