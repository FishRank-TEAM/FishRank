import { assertDayCodePhoto, normalizeDayCode, seoulDateKey } from './day-code.util';

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

  it('촬영일이 코드 날짜와 같고 대회 기간 안이면 통과한다', () => {
    const takenAt = new Date('2026-10-20T03:00:00.000Z');
    expect(assertDayCodePhoto({
      takenAt,
      codeDate: '2026-10-20',
      startAt: new Date('2026-10-19T15:00:00.000Z'),
      endAt: new Date('2026-10-21T15:00:00.000Z'),
    })).toEqual({ ok: true });
  });

  it('다른 날 사진과 기간 밖 사진은 거절한다', () => {
    const window = {
      codeDate: '2026-10-20',
      startAt: new Date('2026-10-20T06:00:00.000Z'),
      endAt: new Date('2026-10-21T15:00:00.000Z'),
    };
    expect(assertDayCodePhoto({
      ...window,
      takenAt: new Date('2026-10-19T03:00:00.000Z'),
    }).ok).toBe(false);
    expect(assertDayCodePhoto({
      ...window,
      takenAt: new Date('2026-10-20T03:00:00.000Z'),
    }).ok).toBe(false);
  });
});
