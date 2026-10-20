import { normalizeDayCode, seoulDateKey } from './day-code.util';

describe('대회 일일 코드', () => {
  it('서울 날짜 기준으로 날짜 키를 만든다', () => {
    expect(seoulDateKey(new Date('2026-10-20T14:59:00.000Z'))).toBe('2026-10-20');
    expect(seoulDateKey(new Date('2026-10-20T15:00:00.000Z'))).toBe('2026-10-21');
  });

  it('영문과 숫자 4~12자만 코드로 받는다', () => {
    expect(normalizeDayCode(' ab12 ')).toBe('AB12');
    expect(normalizeDayCode('abc')).toBeNull();
    expect(normalizeDayCode('한글코드')).toBeNull();
    expect(normalizeDayCode(12)).toBeNull();
  });
});
