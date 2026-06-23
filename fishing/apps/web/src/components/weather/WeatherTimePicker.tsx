'use client';

import { useMemo, useState } from 'react';
import type { WeatherDay, WeatherSlot } from '@/lib/weather';
import {
  formatDateInput,
  formatTimeInput,
  parseDateInput,
  parseTimeInput,
  TIME_PERIODS,
  type TimePeriod,
} from '@/lib/weather-time';

type Props = {
  days: WeatherDay[];
  selectedDate: string;
  selectedHour: number;
  onDateChange: (date: string) => void;
  onHourChange: (hour: number) => void;
};

export default function WeatherTimePicker({
  days,
  selectedDate,
  selectedHour,
  onDateChange,
  onHourChange,
}: Props) {
  const [period, setPeriod] = useState<TimePeriod>('all');

  const selectedDay = useMemo(
    () => days.find((d) => d.date === selectedDate) ?? days[0],
    [days, selectedDate],
  );

  const visibleHours = useMemo(() => {
    const def = TIME_PERIODS.find((p) => p.id === period) ?? TIME_PERIODS[0];
    return def.hours;
  }, [period]);

  const minDate = days[0]?.date ?? selectedDate;
  const maxDate = days[days.length - 1]?.date ?? selectedDate;

  const handleDateInput = (value: string) => {
    const parsed = parseDateInput(value);
    if (days.some((d) => d.date === parsed)) {
      onDateChange(parsed);
    }
  };

  const handleTimeInput = (value: string) => {
    onHourChange(parseTimeInput(value));
  };

  if (!selectedDay) return null;

  return (
    <details className="weather-time-picker">
      <summary className="weather-time-picker-summary">
        <span className="weather-section-title">날짜·시간 직접 선택</span>
        <span className="weather-section-desc">캘린더와 시간대 버튼으로 바꾸기</span>
      </summary>

      <div className="weather-time-picker-body">
        <div className="weather-time-controls">
          <label className="weather-time-input-group">
            <span>날짜</span>
            <input
              type="date"
              className="weather-time-input"
              value={formatDateInput(selectedDate)}
              min={formatDateInput(minDate)}
              max={formatDateInput(maxDate)}
              onChange={(e) => handleDateInput(e.target.value)}
            />
          </label>
          <label className="weather-time-input-group">
            <span>시간</span>
            <input
              type="time"
              className="weather-time-input"
              value={formatTimeInput(selectedHour)}
              step={3600}
              onChange={(e) => handleTimeInput(e.target.value)}
            />
          </label>
        </div>

        <div className="weather-period-tabs">
          {TIME_PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`weather-period-tab${period === p.id ? ' active' : ''}`}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="weather-hour-tabs weather-hour-tabs-full">
          {visibleHours.map((hour) => {
            const slot = selectedDay.slots.find((s) => s.hour === hour);
            if (!slot) return null;
            return (
              <HourButton
                key={slot.time}
                slot={slot}
                active={selectedHour === hour}
                onSelect={() => onHourChange(hour)}
              />
            );
          })}
        </div>
      </div>
    </details>
  );
}

function HourButton({
  slot,
  active,
  onSelect,
}: {
  slot: WeatherSlot;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`weather-hour-tab${active ? ' active' : ''}${slot.isCurrent ? ' current' : ''}${!slot.hasForecast ? ' estimated' : ''}`}
      onClick={onSelect}
      title={slot.isEstimated ? '인근 시간 데이터로 추정' : slot.hasForecast ? '예보 데이터' : '예보 없음'}
    >
      <span>{slot.hourLabel}</span>
      {slot.isCurrent && <em>현재</em>}
      {slot.isEstimated && !slot.isCurrent && <em>추정</em>}
    </button>
  );
}
