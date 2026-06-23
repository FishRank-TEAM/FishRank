'use client';

import type { WeatherDay } from '@/lib/weather';
import { isToday } from '@/lib/weather';
import {
  dayPrecipSummary,
  dominantSkyLabel,
  formatTempRange,
  resolveDayTempRange,
  shortDayLabel,
} from '@/lib/weather-summary';

type Props = {
  days: WeatherDay[];
  selectedDate: string;
  currentTemp?: number;
  onSelectDate: (date: string) => void;
};

export default function WeatherShortForecast({
  days,
  selectedDate,
  currentTemp,
  onSelectDate,
}: Props) {
  const forecastDays = days.slice(0, 3);
  if (forecastDays.length === 0) return null;

  return (
    <section className="weather-short-forecast">
      <h3 className="weather-short-forecast-title">단기예보 (3일)</h3>
      <div className="weather-short-forecast-list">
        {forecastDays.map((day, index) => {
          const active = day.date === selectedDate;
          const today = isToday(day.date);
          const { min, max } = resolveDayTempRange(day, today ? currentTemp : undefined);
          const tempLabel = formatTempRange(min, max);

          return (
            <button
              key={day.date}
              type="button"
              className={`weather-short-forecast-item${active ? ' active' : ''}`}
              onClick={() => onSelectDate(day.date)}
            >
              <span className="weather-short-forecast-day">{shortDayLabel(day.date, index)}</span>
              <span className="weather-short-forecast-mid">
                <em>{dominantSkyLabel(day)}</em>
                <span>{dayPrecipSummary(day)}</span>
              </span>
              <span className="weather-short-forecast-right">
                {tempLabel ? (
                  <strong>{tempLabel}</strong>
                ) : (
                  <span className="weather-short-forecast-empty">기온 없음</span>
                )}
                {day.maxPrecipProb != null && (
                  <em>{day.maxPrecipProb}%</em>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
