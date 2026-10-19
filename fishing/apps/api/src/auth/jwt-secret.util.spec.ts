import { assertJwtSecret } from './jwt-secret.util';

describe('assertJwtSecret', () => {
  it('16자 이상이면 트림한 값을 반환한다', () => {
    expect(assertJwtSecret('  fishrank-secret-ok  ')).toBe('fishrank-secret-ok');
  });

  it.each([undefined, null, '', '   ', 'short-secret'])(
    '짧거나 비어 있으면 기동을 막는다: %s',
    (secret) => {
      expect(() => assertJwtSecret(secret)).toThrow(/JWT_SECRET/);
    },
  );
});
