import { parseLimit, parsePageLimit } from './pagination.util';

describe('parsePageLimit', () => {
  it('정상 값은 정수로 맞춘다', () => {
    expect(parsePageLimit('2', '10.9', 20, 50)).toEqual({ page: 2, limit: 10 });
  });

  it('숫자가 아니거나 0 이하면 기본값을 쓴다', () => {
    expect(parsePageLimit('abc', '-3', 20, 50)).toEqual({ page: 1, limit: 20 });
    expect(parsePageLimit(0, Number.NaN, 20, 50)).toEqual({ page: 1, limit: 20 });
  });

  it('limit 상한을 넘기지 않는다', () => {
    expect(parsePageLimit(1, 100000, 20, 50)).toEqual({ page: 1, limit: 50 });
    expect(parseLimit(100000, 10, 100)).toBe(100);
  });
});
