'use client';

import type { WeatherDay } from '@/lib/weather';
import { formatDayLength } from '@/lib/weather';
import { parseClockTime } from '@/lib/weather-time';

type Props = {
  day: WeatherDay;
  onJumpToHour: (hour: number) => void;
};

export default function WeatherSideInfo({ day, onJumpToHour }: Props) {
  const { sunMoon, tide } = day;

  return (
    <aside className="weather-side-info">
      <h3 className="weather-side-title">출조 정보</h3>

      <div className="weather-side-block">
        <div className="weather-side-row">
          <span>☀️ 일출</span>
          <button type="button" className="weather-time-jump" onClick={() => onJumpToHour(parseClockTime(sunMoon.sunrise))}>
            {sunMoon.sunrise}
          </button>
        </div>
        <div className="weather-side-row">
          <span>🌅 일몰</span>
          <button type="button" className="weather-time-jump" onClick={() => onJumpToHour(parseClockTime(sunMoon.sunset))}>
            {sunMoon.sunset}
          </button>
        </div>
        <div className="weather-side-row">
          <span>낮 길이</span>
          <strong>{formatDayLength(sunMoon.dayLengthMin)}</strong>
        </div>
      </div>

      <div className="weather-side-block">
        <div className="weather-side-row">
          <span>{sunMoon.moonPhaseEmoji} 물때</span>
          <strong>{tide.lunarLabel} · {tide.tideStrength}</strong>
        </div>
        <p className="weather-side-desc">{tide.tideDesc}</p>
      </div>

      <div className="weather-side-tide-grid">
        {tide.events.map((ev) => (
          <button
            key={`${ev.time}-${ev.type}`}
            type="button"
            className={`weather-side-tide ${ev.type}`}
            onClick={() => onJumpToHour(parseClockTime(ev.time))}
          >
            <span>{ev.time}</span>
            <em>{ev.label}</em>
          </button>
        ))}
      </div>

      <p className="weather-side-tip">{tide.fishingTip}</p>
    </aside>
  );
}
