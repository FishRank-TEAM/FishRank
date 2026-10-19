export function parsePageLimit(
  page: unknown,
  limit: unknown,
  defaultLimit = 20,
  maxLimit = 50,
): { page: number; limit: number } {
  const parsedPage = Number(page);
  const parsedLimit = Number(limit);
  const safePage = Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.floor(parsedPage) : 1;
  const safeLimit =
    Number.isFinite(parsedLimit) && parsedLimit >= 1
      ? Math.min(maxLimit, Math.floor(parsedLimit))
      : defaultLimit;
  return { page: safePage, limit: safeLimit };
}

export function parseLimit(limit: unknown, defaultLimit: number, maxLimit: number): number {
  return parsePageLimit(1, limit, defaultLimit, maxLimit).limit;
}
