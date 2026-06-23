'use client';

import type { WeatherDay, WeatherSlot } from '@/lib/weather';
import { dayTabLabel, fishingStars, skyEmoji } from '@/lib/weather';
import { daySummary, precipLabel, tripVerdict, windLabel } from '@/lib/weather-summary';

type Props = {
  day: WeatherDay;
  slot: WeatherSlot;
  bestTimes: { hour: number; hourLabel: string; label: string }[];
};

export default function WeatherNowCard({ day, slot, bestTimes }: Props) {
  const emoji = skyEmoji(slot.sky, slot.precipitationType);
  const pop = slot.precipitationProb ?? day.maxPrecipProb;
  const verdict = tripVerdict(slot.fishingCondition.score, slot.windSpeed, pop);
  const summary = daySummary(day);

  return (
    <section className="weather-g-card">
      <div className="weather-g-hero-row">
        <div className="weather-g-now">
          <div className="weather-g-now-left">
            <span className="weather-g-now-emoji">{emoji}</span>
            <div className="weather-g-now-temp">
              {slot.temp != null ? `${slot.temp}` : '-'}
              <span className="weather-g-now-unit">°C</span>
            </div>
          </div>

          <div className="weather-g-now-right">
            <div className="weather-g-now-head">
              <span className="weather-g-now-day">{dayTabLabel(day)}</span>
              <p className="weather-g-now-summary">{summary}</p>
            </div>
            <div className="weather-g-stats">
              <div className="weather-g-stat">
                <span className="weather-g-stat-label">강수확률</span>
                <strong>{pop != null ? `${pop}%` : '-'}</strong>
                <em>{precipLabel(pop)}</em>
              </div>
              <div className="weather-g-stat">
                <span className="weather-g-stat-label">습도</span>
                <strong>{slot.humidity != null ? `${slot.humidity}%` : '-'}</strong>
              </div>
              <div className="weather-g-stat">
                <span className="weather-g-stat-label">풍속</span>
                <strong>{slot.windSpeed.toFixed(1)}m/s</strong>
                <em>{windLabel(slot.windSpeed)}</em>
              </div>
            </div>
          </div>
        </div>

        <aside
          className="weather-g-fishing"
          style={{ borderColor: `${verdict.color}33`, background: `${verdict.color}0d` }}
        >
          <div className="weather-g-fishing-verdict" style={{ color: verdict.color }}>
            <span className="weather-g-fishing-emoji">{verdict.emoji}</span>
            <div>
              <strong>{verdict.label}</strong>
              <span>{slot.fishingCondition.desc}</span>
            </div>
          </div>
          <div className="weather-g-fishing-score" style={{ color: slot.fishingCondition.color }}>
            {fishingStars(slot.fishingCondition.score)}
            <em>{slot.fishingCondition.label}</em>
          </div>
        </aside>
      </div>

      {bestTimes.length > 0 && (
        <div className="weather-g-best">
          <span>🎣 추천 시간</span>
          {bestTimes.map((t) => (
            <span key={t.hour} className="weather-g-best-chip">{t.hourLabel} · {t.label}</span>
          ))}
        </div>
      )}
    </section>
  );
}
