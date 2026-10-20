import { hashRefreshToken } from './refresh-token.util';

describe('hashRefreshToken', () => {
  it('같은 토큰은 같은 해시이고 원문과 다르다', () => {
    const hash = hashRefreshToken('refresh-token');
    expect(hash).toBe(hashRefreshToken('refresh-token'));
    expect(hash).not.toBe('refresh-token');
    expect(hashRefreshToken('other')).not.toBe(hash);
  });
});
