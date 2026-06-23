'use client';

import type { WeatherDay } from '@/lib/weather';
import { parseClockTime } from '@/lib/weather-time';

type Props = {
  day: WeatherDay;
  onJumpToHour: (hour: number) => void;
};

export default function WeatherFishingBar({ day, onJumpToHour }: Props) {
  const { sunMoon, tide } = day;

  return (
    <section className="weather-g-fishing-bar">
      <button type="button" className="weather-g-fb-item" onClick={() => onJumpToHour(parseClockTime(sunMoon.sunrise))}>
        <span>☀️ 일출</span>
        <strong>{sunMoon.sunrise}</strong>
      </button>
      <button type="button" className="weather-g-fb-item" onClick={() => onJumpToHour(parseClockTime(sunMoon.sunset))}>
        <span>🌅 일몰</span>
        <strong>{sunMoon.sunset}</strong>
      </button>
      <div className="weather-g-fb-item static">
        <span>{sunMoon.moonPhaseEmoji} 물때</span>
        <strong>{tide.lunarLabel}</strong>
      </div>
      {tide.events.slice(0, 2).map((ev) => (
        <button
          key={`${ev.time}-${ev.type}`}
          type="button"
          className={`weather-g-fb-item ${ev.type}`}
          onClick={() => onJumpToHour(parseClockTime(ev.time))}
        >
          <span>{ev.type === 'high' ? '🌊 만조' : '🏖 간조'}</span>
          <strong>{ev.time}</strong>
        </button>
      ))}
    </section>
  );
}
