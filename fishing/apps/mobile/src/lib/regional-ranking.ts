import { parseActivityRegion, getDistrictLabel } from '@/data/korean-regions';
import type { Region } from '@/types/regional-ranking';

export function getMyRegionKey(activityRegion?: string | null): string | null {
  return parseActivityRegion(activityRegion)?.province ?? null;
}

export function formatDistrictLabel(
  activityRegion?: string | null,
): string | undefined {
  const parsed = parseActivityRegion(activityRegion);
  if (!parsed?.district) return undefined;
  return getDistrictLabel(parsed.province, parsed.district) ?? parsed.district;
}

export function sortRegionsWithMine(regions: Region[], myRegionKey: string | null): Region[] {
  if (!myRegionKey) return regions;
  const mine = regions.find((r) => r.regionKey === myRegionKey);
  if (!mine) return regions;
  return [mine, ...regions.filter((r) => r.regionKey !== myRegionKey)];
}

export function regionalRowLabel(item: Region, listIndex: number, isMine: boolean): string {
  const rank = listIndex + 1;
  const leader = item.topNickname
    ? `${item.topNickname}, ${item.topLengthCm ?? '-'}센티미터`
    : '기록 없음';
  const prefix = isMine ? '내 지역, ' : '';
  return `${prefix}${item.regionName}, ${rank}위, 1위 ${leader}`;
}
