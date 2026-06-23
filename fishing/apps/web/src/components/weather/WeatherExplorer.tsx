'use client';

import { useEffect, useMemo, useState } from 'react';
import type { WeatherData } from '@/lib/weather';
import { dayTabLabel, isToday, skyEmoji } from '@/lib/weather';
import WeatherCharts from './WeatherCharts';
import WeatherFishingBar from './WeatherFishingBar';
import WeatherNowCard from './WeatherNowCard';
import WeatherShortForecast from './WeatherShortForecast';
import WeatherWeekRow from './WeatherWeekRow';

type Props = {
  weather: WeatherData;
};

export default function WeatherExplorer({ weather }: Props) {
  const defaultDate = weather.days[0]?.date ?? '';
  const defaultHour = weather.days[0]?.slots.find((s) => s.isCurrent)?.hour
    ?? weather.days[0]?.slots.find((s) => s.hasForecast !== false)?.hour
    ?? 12;

  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [selectedHour, setSelectedHour] = useState(defaultHour);

  useEffect(() => {
    setSelectedDate(defaultDate);
    setSelectedHour(defaultHour);
  }, [defaultDate, defaultHour]);

  const selectedDay = useMemo(
    () => weather.days.find((d) => d.date === selectedDate) ?? weather.days[0],
    [weather.days, selectedDate],
  );

  const selectedSlot = useMemo(
    () => selectedDay?.slots.find((s) => s.hour === selectedHour) ?? selectedDay?.slots[0],
    [selectedDay, selectedHour],
  );

  const bestTimes = useMemo(() => {
    if (!isToday(selectedDay?.date ?? '')) {
      return selectedDay?.bestHours.map((h) => {
        const slot = selectedDay.slots.find((s) => s.hour === h);
        return {
          hour: h,
          hourLabel: slot?.hourLabel ?? `${String(h).padStart(2, '0')}:00`,
          label: slot?.fishingCondition.label ?? '',
        };
      }) ?? [];
    }
    return weather.bestTimesToday.map((t) => ({
      hour: t.hour,
      hourLabel: t.hourLabel,
      label: t.label,
    }));
  }, [selectedDay, weather.bestTimesToday]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    const day = weather.days.find((d) => d.date === date);
    if (day?.slots.find((s) => s.isCurrent)) {
      setSelectedHour(day.slots.find((s) => s.isCurrent)!.hour);
    } else if (day && !day.slots.some((s) => s.hour === selectedHour)) {
      setSelectedHour(day.slots.find((s) => s.hasForecast !== false)?.hour ?? day.slots[0]?.hour ?? 0);
    }
  };

  if (!selectedDay || !selectedSlot) return null;

  return (
    <div className="weather-explorer weather-g-layout">
      <WeatherNowCard
        day={selectedDay}
        slot={selectedSlot}
        bestTimes={bestTimes}
      />

      <WeatherFishingBar day={selectedDay} onJumpToHour={setSelectedHour} />

      <WeatherCharts
        day={selectedDay}
        selectedHour={selectedHour}
        onHourChange={setSelectedHour}
      />

      <WeatherShortForecast
        days={weather.days}
        selectedDate={selectedDate}
        currentTemp={weather.current.temp}
        onSelectDate={handleDateChange}
      />

      <WeatherWeekRow
        days={weather.days}
        selectedDate={selectedDate}
        currentTemp={weather.current.temp}
        onSelectDate={handleDateChange}
      />

      <details className="weather-tech-details">
        <summary>{dayTabLabel(selectedDay)} 상세 시간표</summary>
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
              {selectedDay.slots.map((slot) => (
                <tr
                  key={slot.time}
                  className={selectedHour === slot.hour ? 'selected' : undefined}
                  onClick={() => setSelectedHour(slot.hour)}
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
        <p className="weather-tech-note">
          물때·조석은 음력 기반 근사치입니다.
          {isToday(selectedDay.date) ? ` · 실황 ${weather.current.observedAt}` : ''}
        </p>
      </details>
    </div>
  );
}
