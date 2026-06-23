'use client';

import type { WeatherDay, WeatherSlot } from '@/lib/weather';
import { dayTabLabel, fishingStars, skyEmoji } from '@/lib/weather';

type Props = {
  day: WeatherDay;
  slot: WeatherSlot;
};

export default function WeatherHero({ day, slot }: Props) {
  const emoji = skyEmoji(slot.sky, slot.precipitationType);
  const fc = slot.fishingCondition;

  return (
    <section className="weather-hero weather-hero-compact">
      <div className="weather-hero-compact-main">
        <span className="weather-hero-emoji">{emoji}</span>
        <div className="weather-hero-compact-body">
          <p className="weather-hero-date">
            {dayTabLabel(day)} {slot.hourLabel}
            {slot.isCurrent && <span className="weather-hero-badge">지금</span>}
            {slot.isEstimated && <span className="weather-hero-badge muted">추정</span>}
          </p>
          <div className="weather-hero-temp">
            {slot.temp != null ? `${slot.temp}°` : '-'}
            <span className="weather-hero-sky">{slot.skyLabel}</span>
          </div>
        </div>
        <div
          className="weather-hero-score-inline"
          style={{ background: `${fc.color}14`, color: fc.color, borderColor: `${fc.color}44` }}
        >
          <span>{fc.label}</span>
          <em>{fishingStars(fc.score)}</em>
        </div>
      </div>

      <div className="weather-hero-stats-inline">
        <span>💨 {slot.windSpeed.toFixed(1)}m/s {slot.windDirectionLabel}</span>
        <span>💧 {slot.humidity != null ? `${slot.humidity}%` : '-'}</span>
        <span>🌧 {slot.precipitationProb != null ? `${slot.precipitationProb}%` : slot.precipitationLabel}</span>
        <span>🌊 {slot.wave != null ? `${slot.wave}m` : '-'}</span>
      </div>
    </section>
  );
}
