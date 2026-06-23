'use client';

import { useState } from 'react';
import type { WeatherDay } from '@/lib/weather';
import { dayTabLabel, fishingStars, skyEmoji } from '@/lib/weather';

type Props = {
  day: WeatherDay;
  selectedHour: number;
  onSelectHour: (hour: number) => void;
};

export default function WeatherHourCards({ day, selectedHour, onSelectHour }: Props) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section className="weather-hour-cards-section">
      <div className="weather-hour-cards-head">
        <div>
          <h2 className="weather-section-title">{dayTabLabel(day)} 시간별 보기</h2>
          <p className="weather-section-desc">카드를 눌러 시간을 바꿀 수 있습니다</p>
        </div>
        <button type="button" className="weather-toggle-table" onClick={() => setShowTable((v) => !v)}>
          {showTable ? '표 숨기기' : '표로 보기'}
        </button>
      </div>

      <div className="weather-hour-cards">
        {day.slots.map((slot) => (
          <button
            key={slot.time}
            type="button"
            className={[
              'weather-hour-card',
              selectedHour === slot.hour ? 'active' : '',
              slot.isCurrent ? 'current' : '',
              slot.isEstimated ? 'estimated' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onSelectHour(slot.hour)}
          >
            <div className="weather-hour-card-top">
              <span className="weather-hour-card-time">{slot.hourLabel}</span>
              <span className="weather-hour-card-emoji">{skyEmoji(slot.sky, slot.precipitationType)}</span>
            </div>
            <div className="weather-hour-card-temp">{slot.temp != null ? `${slot.temp}°` : '-'}</div>
            <div className="weather-hour-card-fish" style={{ color: slot.fishingCondition.color }}>
              {fishingStars(slot.fishingCondition.score)}
            </div>
            <div className="weather-hour-card-meta">
              💨 {slot.windSpeed.toFixed(1)}m/s
              {slot.precipitationProb != null ? ` · 🌧 ${slot.precipitationProb}%` : ''}
            </div>
          </button>
        ))}
      </div>

      {showTable && (
        <div className="weather-table-wrap">
          <table className="weather-table">
            <thead>
              <tr>
                <th>시간</th>
                <th>날씨</th>
                <th>기온</th>
                <th>바람</th>
                <th>강수확률</th>
                <th>낚시지수</th>
              </tr>
            </thead>
            <tbody>
              {day.slots.map((slot) => (
                <tr
                  key={slot.time}
                  className={selectedHour === slot.hour ? 'selected' : undefined}
                  onClick={() => onSelectHour(slot.hour)}
                >
                  <td>{slot.hourLabel}{slot.isCurrent ? ' · 현재' : ''}</td>
                  <td>{skyEmoji(slot.sky, slot.precipitationType)} {slot.skyLabel}</td>
                  <td>{slot.temp != null ? `${slot.temp}°C` : '-'}</td>
                  <td>{slot.windSpeed.toFixed(1)}m/s {slot.windDirectionLabel}</td>
                  <td>{slot.precipitationProb != null ? `${slot.precipitationProb}%` : '-'}</td>
                  <td style={{ color: slot.fishingCondition.color, fontWeight: 700 }}>{slot.fishingCondition.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
