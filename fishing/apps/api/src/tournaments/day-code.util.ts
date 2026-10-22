const CODE_PATTERN = /^[A-Z0-9]{4,12}$/;

export function seoulDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function normalizeDayCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

/**
 * 오늘 코드를 받은 사진은 그 코드의 서울 날짜에 찍혔고, 대회 기간 안이어야 한다.
 * 촬영 시각이 없는 경우는 여기서 통과시키고, 호출하는 쪽이 확인 불가로 남긴다.
 */
export function assertDayCodePhoto(input: {
  takenAt: Date;
  codeDate: string;
  startAt: Date;
  endAt: Date;
}): { ok: true } | { ok: false; reason: string } {
  if (Number.isNaN(input.takenAt.getTime())) {
    return { ok: false, reason: '촬영 시각을 확인할 수 없습니다.' };
  }
  if (seoulDateKey(input.takenAt) !== input.codeDate) {
    return {
      ok: false,
      reason: '촬영일이 오늘 대회 코드의 날짜와 다릅니다. 오늘 찍은 사진을 올려주세요.',
    };
  }
  if (input.takenAt < input.startAt || input.takenAt > input.endAt) {
    return { ok: false, reason: '촬영 시각이 대회 기간 밖입니다.' };
  }
  return { ok: true };
}
