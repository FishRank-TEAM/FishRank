import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { detectImageKind, hasImageMagic } from './image-magic.util';

describe('detectImageKind', () => {
  it('jpeg, png, gif, webp 시그니처를 구분한다', () => {
    expect(detectImageKind(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe('jpeg');
    expect(
      detectImageKind(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe('png');
    expect(detectImageKind(Buffer.from('GIF89a', 'ascii'))).toBe('gif');
    const webp = Buffer.alloc(12);
    webp.write('RIFF', 0, 'ascii');
    webp.write('WEBP', 8, 'ascii');
    expect(detectImageKind(webp)).toBe('webp');
  });

  it('확장자만 이미지인 텍스트는 거절한다', () => {
    expect(detectImageKind(Buffer.from('<html></html>'))).toBeNull();
    expect(detectImageKind(Buffer.from(''))).toBeNull();
  });
});

describe('hasImageMagic', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'fishrank-magic-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('디스크의 jpeg 시그니처만 통과한다', async () => {
    const jpeg = join(dir, 'fish.jpg');
    const fake = join(dir, 'note.jpg');
    await writeFile(jpeg, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    await writeFile(fake, 'not an image');
    await expect(hasImageMagic(jpeg)).resolves.toBe(true);
    await expect(hasImageMagic(fake)).resolves.toBe(false);
  });
});
