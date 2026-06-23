'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { WeatherDay } from '@/lib/weather';
import { skyEmoji } from '@/lib/weather';
import { slotsToChartData, tempDomain, type ChartPoint } from '@/lib/weather-chart';

type ChartTab = 'temp' | 'precip' | 'wind' | 'fishing';

type Props = {
  day: WeatherDay;
  selectedHour: number;
  onHourChange: (hour: number) => void;
};

const TABS: { id: ChartTab; label: string }[] = [
  { id: 'temp', label: '기온' },
  { id: 'precip', label: '강수확률' },
  { id: 'wind', label: '바람' },
  { id: 'fishing', label: '낚시지수' },
];

function formatHourTick(h: number): string {
  if (h === 0) return '오전 12시';
  if (h < 12) return `오전 ${h}시`;
  if (h === 12) return '오후 12시';
  return `오후 ${h - 12}시`;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartPoint }> }) {
  if (!active || !payload?.[0]) return null;
  const p = payload[0].payload;
  return (
    <div className="weather-chart-tooltip">
      <div className="weather-chart-tooltip-title">{p.label}{p.isCurrent ? ' · 현재' : ''}</div>
      <div>{p.skyEmoji} {p.temp != null ? `${p.temp}°C` : '기온 없음'}</div>
      <div>낚시 {p.fishLabel} ({p.score}/5)</div>
      <div>바람 {p.wind.toFixed(1)} m/s</div>
      {p.pop != null && <div>강수확률 {p.pop}%</div>}
    </div>
  );
}

export default function WeatherCharts({ day, selectedHour, onHourChange }: Props) {
  const [tab, setTab] = useState<ChartTab>('temp');
  const data = useMemo(() => slotsToChartData(day.slots, skyEmoji), [day.slots]);
  const [yMin, yMax] = useMemo(() => tempDomain(data), [data]);

  const handlePointClick = (point: ChartPoint) => {
    onHourChange(point.hour);
  };

  const tickInterval = 3;

  return (
    <section className="weather-g-charts">
      <div className="weather-g-chart-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`weather-g-chart-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="weather-g-chart-panel">
        <ResponsiveContainer width="100%" height={160}>
          {tab === 'temp' && (
            <ComposedChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={formatHourTick} tick={{ fontSize: 10 }} interval={tickInterval} />
              <YAxis domain={[yMin, yMax]} tick={{ fontSize: 10 }} unit="°" width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="temp"
                stroke="#f9a825"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#f9a825' }}
                connectNulls
              />
              <ReferenceLine x={selectedHour} stroke="#1565c0" strokeWidth={2} />
            </ComposedChart>
          )}

          {tab === 'precip' && (
            <ComposedChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={formatHourTick} tick={{ fontSize: 10 }} interval={tickInterval} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="pop"
                fill="#42a5f5"
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
                onClick={(entry) => {
                  const payload = (entry as { payload?: ChartPoint }).payload;
                  if (payload) handlePointClick(payload);
                }}
              />
              <ReferenceLine x={selectedHour} stroke="#1565c0" strokeWidth={2} />
            </ComposedChart>
          )}

          {tab === 'wind' && (
            <ComposedChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={formatHourTick} tick={{ fontSize: 10 }} interval={tickInterval} />
              <YAxis tick={{ fontSize: 10 }} unit="m/s" width={36} />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="wind"
                fill="#26a69a"
                fillOpacity={0.85}
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
                onClick={(entry) => {
                  const payload = (entry as { payload?: ChartPoint }).payload;
                  if (payload) handlePointClick(payload);
                }}
              />
              <ReferenceLine x={selectedHour} stroke="#1565c0" strokeWidth={2} />
            </ComposedChart>
          )}

          {tab === 'fishing' && (
            <ComposedChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={formatHourTick} tick={{ fontSize: 10 }} interval={tickInterval} />
              <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10 }} width={24} />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="score"
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
                onClick={(entry) => {
                  const payload = (entry as { payload?: ChartPoint }).payload;
                  if (payload) handlePointClick(payload);
                }}
              >
                {data.map((entry) => (
                  <Cell key={entry.hour} fill={entry.fishColor} fillOpacity={entry.isEstimated ? 0.45 : 0.95} />
                ))}
              </Bar>
              <ReferenceLine x={selectedHour} stroke="#1565c0" strokeWidth={2} />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      <p className="weather-g-chart-hint">
        {String(selectedHour).padStart(2, '0')}:00 선택 · 그래프를 눌러 시간 변경
      </p>
    </section>
  );
}
