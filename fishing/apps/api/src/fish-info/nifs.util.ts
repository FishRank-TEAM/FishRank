/** NIFS OpenAPI_json 응답 파싱 (data.go.kr 표준 형식과 다름) */
export function getNifsResultCode(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const header = (payload as Record<string, unknown>).header as Record<string, unknown> | undefined;
  return typeof header?.resultCode === 'string' ? header.resultCode : null;
}

export function extractNifsItems(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== 'object') return [];

  const body = (payload as Record<string, unknown>).body as Record<string, unknown> | undefined;
  if (!body) return [];

  const item = body.item;
  if (!item) return [];
  if (Array.isArray(item)) return item as Record<string, unknown>[];
  return [item as Record<string, unknown>];
}
