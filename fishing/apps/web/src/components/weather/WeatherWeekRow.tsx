'use client';

import type { WeatherDay } from '@/lib/weather';
import { isToday } from '@/lib/weather';
import { dominantSkyEmoji, formatTempRange, resolveDayTempRange, weekDayShort } from '@/lib/weather-summary';

type Props = {
  days: WeatherDay[];
  selectedDate: string;
  currentTemp?: number;
  onSelectDate: (date: string) => void;
};

export default function WeatherWeekRow({ days, selectedDate, currentTemp, onSelectDate }: Props) {
  return (
    <section className="weather-g-week">
      {days.map((day) => {
        const active = day.date === selectedDate;
        const emoji = dominantSkyEmoji(day);
        const { min, max } = resolveDayTempRange(day, isToday(day.date) ? currentTemp : undefined);
        const temps = formatTempRange(min, max);
        return (
          <button
            key={day.date}
            type="button"
            className={`weather-g-week-item${active ? ' active' : ''}`}
            onClick={() => onSelectDate(day.date)}
          >
            <span className="weather-g-week-day">{isToday(day.date) ? '오늘' : weekDayShort(day.date)}</span>
            <span className="weather-g-week-emoji">{emoji}</span>
            <span className="weather-g-week-temps">
              {temps ?? '-'}
            </span>
          </button>
        );
      })}
    </section>
  );
}
