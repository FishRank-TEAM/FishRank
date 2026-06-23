'use client';

import type { WeatherDay } from '@/lib/weather';
import { fishingStars, skyEmoji } from '@/lib/weather';

type Props = {
  day: WeatherDay;
  selectedHour: number;
  onSelectHour: (hour: number) => void;
};

export default function WeatherHourStrip({ day, selectedHour, onSelectHour }: Props) {
  return (
    <div className="weather-hour-strip-wrap">
      <div className="weather-hour-strip" role="listbox" aria-label="시간 선택">
        {day.slots.map((slot) => (
          <button
            key={slot.time}
            type="button"
            role="option"
            aria-selected={selectedHour === slot.hour}
            className={[
              'weather-hour-strip-item',
              selectedHour === slot.hour ? 'active' : '',
              slot.isCurrent ? 'current' : '',
              slot.isEstimated ? 'estimated' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onSelectHour(slot.hour)}
          >
            <span className="weather-hour-strip-time">{slot.hourLabel.replace(':00', '시')}</span>
            <span className="weather-hour-strip-emoji">{skyEmoji(slot.sky, slot.precipitationType)}</span>
            <span className="weather-hour-strip-temp">{slot.temp != null ? `${slot.temp}°` : '-'}</span>
            <span className="weather-hour-strip-fish" style={{ color: slot.fishingCondition.color }}>
              {fishingStars(slot.fishingCondition.score)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
