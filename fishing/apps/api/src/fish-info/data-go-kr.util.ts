/** 공공데이터포털 표준 응답에서 item 배열 추출 */
export function extractPublicDataItems(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== 'object') return [];

  const root = payload as Record<string, unknown>;
  const response = (root.response ?? root) as Record<string, unknown>;
  const body = response.body as Record<string, unknown> | undefined;
  if (!body) return [];

  const items = body.items as unknown;
  if (!items) return [];

  // 낙동강 담수 API: items가 [{ item: {...} }, ...] 배열
  if (Array.isArray(items)) {
    return items
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const wrapped = entry as Record<string, unknown>;
        const inner = wrapped.item;
        if (inner && typeof inner === 'object') return inner as Record<string, unknown>;
        return wrapped;
      })
      .filter((item): item is Record<string, unknown> => item !== null);
  }

  if (typeof items === 'object') {
    const container = items as Record<string, unknown>;
    const item = container.item;
    if (!item) return [];
    if (Array.isArray(item)) return item as Record<string, unknown>[];
    return [item as Record<string, unknown>];
  }

  return [];
}

export function getPublicDataResultCode(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const response = (payload as Record<string, unknown>).response as Record<string, unknown> | undefined;
  const header = response?.header as Record<string, unknown> | undefined;
  return typeof header?.resultCode === 'string' ? header.resultCode : null;
}

export function pickField(item: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = item[key];
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text && text !== 'null') return text;
  }
  return null;
}

export function isOdcloudUrl(url: string): boolean {
  return url.includes('api.odcloud.kr');
}

/** 공공데이터포털 파일API → odcloud 응답 (data 배열) */
export function extractOdcloudItems(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== 'object') return [];
  const data = (payload as Record<string, unknown>).data;
  if (!Array.isArray(data)) return [];
  return data as Record<string, unknown>[];
}
