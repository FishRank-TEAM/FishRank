'use client';

import { useMemo, useState } from 'react';
import type { ReservoirMapItem } from '@/lib/marine-conditions';
import { formatCheckDate, reservoirRateColor } from '@/lib/marine-conditions';

type SortKey = 'ratePercent' | 'facName' | 'waterLevelM';
type SortDir = 'asc' | 'desc';

type Props = {
  rows: ReservoirMapItem[];
  selectedFacCode: string | null;
  onSelect: (row: ReservoirMapItem) => void;
};

export default function ReservoirTable({ rows, selectedFacCode, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('ratePercent');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return a.facName.localeCompare(b.facName, 'ko');
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv, 'ko') : bv.localeCompare(av, 'ko');
      }
      return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'facName' ? 'asc' : 'desc');
    }
  };

  const sortMark = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  if (!rows.length) {
    return <p className="weather-marine-muted">표시할 저수지가 없습니다.</p>;
  }

  return (
    <div className="reservoir-table-wrap">
      <table className="reservoir-table">
        <thead>
          <tr>
            <th>
              <button type="button" className="reservoir-sort-btn" onClick={() => toggleSort('facName')}>
                이름{sortMark('facName')}
              </button>
            </th>
            <th>시군</th>
            <th>
              <button type="button" className="reservoir-sort-btn" onClick={() => toggleSort('ratePercent')}>
                저수율{sortMark('ratePercent')}
              </button>
            </th>
            <th>
              <button type="button" className="reservoir-sort-btn" onClick={() => toggleSort('waterLevelM')}>
                수위{sortMark('waterLevelM')}
              </button>
            </th>
            <th>기준일</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.facCode}
              className={row.facCode === selectedFacCode ? 'selected' : undefined}
              onClick={() => onSelect(row)}
            >
              <td><strong>{row.facName}</strong></td>
              <td>{row.county ?? '-'}</td>
              <td style={{ color: reservoirRateColor(row.ratePercent), fontWeight: 700 }}>
                {row.ratePercent != null ? `${row.ratePercent.toFixed(1)}%` : '-'}
              </td>
              <td>{row.waterLevelM != null ? `${row.waterLevelM.toFixed(2)}m` : '-'}</td>
              <td>{row.checkDate ? formatCheckDate(row.checkDate) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
